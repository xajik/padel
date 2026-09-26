package app.padel.data

import app.padel.engine.EngineError
import app.padel.engine.GameState
import app.padel.engine.ModeId
import app.padel.engine.Player
import app.padel.engine.Settings
import app.padel.engine.Side
import app.padel.engine.createGame
import app.padel.engine.modeInfo
import app.padel.engine.nextRound
import app.padel.engine.setScore
import app.padel.engine.swapPlayers
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.builtins.ListSerializer
import kotlin.coroutines.cancellation.CancellationException
import kotlin.time.Clock

/**
 * Offline-first game store shared by both apps.
 *
 * Every edit is applied to the local state with the shared engine at once (so scoring works
 * with no signal, FR-2.10), then queued as the same granular mutation the web app sends
 * (`score` / `next` / `finish` / `reopen`, or `replace` for manual swaps). [sync] sends the
 * queue in order; the server's reply becomes the new local state, so concurrent editors
 * (web, another phone, an AI agent) converge on the server's view.
 */
class GameRepository(
    private val api: PadelApi,
    private val store: KeyValueStore,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
    private val now: () -> Long = { Clock.System.now().toEpochMilliseconds() },
) {
    /** For Swift/Android callers: production API client and default scope and clock. */
    constructor(baseUrl: String, store: KeyValueStore) : this(PadelApi(baseUrl), store)

    private val mutex = Mutex()
    private val _games = MutableStateFlow(load())

    /** Newest first. */
    val games: StateFlow<List<LocalGame>> = _games.asStateFlow()

    val baseUrl: String get() = api.baseUrl

    fun game(code: String): LocalGame? = _games.value.firstOrNull { it.code == resolve(code) }

    private val renamed = mutableMapOf<String, String>()

    /** The current code for [code]: registering an offline game replaces its provisional code. */
    fun resolve(code: String): String = renamed[code] ?: code

    /** The live game an organizer or player is most likely looking at: widgets, Live Activities. */
    fun activeGame(): LocalGame? = _games.value.firstOrNull { it.game.status == GameStatus.Live }

    /** Swift/Java-friendly observation; the listener runs on the thread that changed the state. */
    fun watch(listener: (List<LocalGame>) -> Unit): Cancellable {
        val job = scope.launch { _games.collect { listener(it) } }
        return Cancellable { job.cancel() }
    }

    /* ------------------------------------------------------------------ */
    /* Create & join                                                        */
    /* ------------------------------------------------------------------ */

    /**
     * Creates the game on this device immediately, then registers it with the server so it can be
     * shared. Offline, it keeps a provisional code until the next [sync].
     */
    @Throws(EngineError::class, CancellationException::class)
    suspend fun create(name: String, settings: Settings, names: List<String>, sides: List<Side>? = null): LocalGame {
        val players = buildPlayers(settings.mode, names, sides)
        val state = createGame(settings, players)
        val t = now()
        val local = LocalGame(
            game = StoredGame(
                id = GameLinks.newCode() + t.toString(36),
                code = GameLinks.newCode(),
                name = name.trim().ifEmpty { modeInfo(settings.mode).name },
                ownerUid = "app",
                status = GameStatus.Live,
                source = "app",
                createdAt = t,
                updatedAt = t,
                state = state,
            ),
            needsCreate = true,
        )
        update { it + local }
        return game(syncCode(local.code)) ?: local
    }

    /**
     * Opens a game from a code, link or QR payload. An organizer link (`?key=`) grants editing
     * when the server accepts the key; otherwise the game is followed as a spectator.
     */
    @Throws(ApiException::class, CancellationException::class)
    suspend fun join(input: String): LocalGame {
        val target = GameLinks.parse(input) ?: throw ApiException("INVALID_CODE", "Game codes have 6 letters and digits, e.g. K7Q2MX.", 400)
        game(target.code)?.let { existing ->
            if (target.organizerKey == null || existing.organizerKey != null) {
                refresh(target.code)
                return game(target.code) ?: existing
            }
        }
        val remote = api.fetch(target.code) ?: throw ApiException("NOT_FOUND", "No game ${target.code}. Check the code with the organizer.", 404)
        val key = target.organizerKey?.takeIf { api.redeem(target.code, it) }
        val joined = LocalGame(game = remote, organizerKey = key, lastSyncedAt = now())
        update { list -> list.filterNot { it.code == target.code } + joined }
        return joined
    }

    /**
     * Joins the game found in scanned content (QR payloads and/or text recognised in a photo or
     * the camera). Tries [GameLinks.candidates] in order until the server knows one, so a word
     * that merely looks like a code doesn't stop a real code further down.
     */
    @Throws(ApiException::class, CancellationException::class)
    suspend fun joinScanned(text: String): LocalGame {
        val candidates = GameLinks.candidates(text).take(MAX_SCAN_CANDIDATES)
        if (candidates.isEmpty()) throw ApiException("NO_CODE", "No game code or QR code found.", 400)
        var notFound: ApiException? = null
        for (c in candidates) {
            try {
                return join(GameLinks.input(c))
            } catch (e: ApiException) {
                if (e.code != "NOT_FOUND") throw e
                notFound = e
            }
        }
        throw notFound!!
    }

    fun remove(code: String) = scope.launch { update { list -> list.filterNot { it.code == code } } }

    /** Forget every game on this device (tests, screenshot runs). */
    @Throws(CancellationException::class)
    suspend fun clear() = update { emptyList() }

    /* ------------------------------------------------------------------ */
    /* Edits (local first)                                                  */
    /* ------------------------------------------------------------------ */

    /** Enter (or clear, with `scoreA = null`) a match score. Returns regenerated round indexes. */
    @Throws(EngineError::class, CancellationException::class)
    suspend fun score(code: String, roundIndex: Int, matchIndex: Int, scoreA: Int?, scoreB: Int?): List<Int> {
        var regenerated = emptyList<Int>()
        edit(code) { g ->
            val res = setScore(g.game.state, roundIndex, matchIndex, scoreA, scoreB)
            regenerated = res.regenerated
            val m = res.state.rounds[roundIndex].matches[matchIndex]
            g.apply(res.state, CloudMutation.Score(m.court, m.scoreA, m.scoreB, roundIndex + 1))
        }
        return regenerated
    }

    @Throws(EngineError::class, CancellationException::class)
    suspend fun next(code: String) = edit(code) { g -> g.apply(nextRound(g.game.state), CloudMutation.Next) }

    @Throws(EngineError::class, CancellationException::class)
    suspend fun finish(code: String) = edit(code) { g -> g.apply(g.game.state, CloudMutation.Finish, GameStatus.Done) }

    @Throws(EngineError::class, CancellationException::class)
    suspend fun reopen(code: String) = edit(code) { g -> g.apply(g.game.state, CloudMutation.Reopen, GameStatus.Live) }

    /** Manual shuffle before a round starts; sent as a full-state `replace` like the web does. */
    @Throws(EngineError::class, CancellationException::class)
    suspend fun swap(code: String, roundIndex: Int, idA: String, idB: String) = edit(code) { g ->
        val state = swapPlayers(g.game.state, roundIndex, idA, idB)
        g.apply(state, CloudMutation.Replace(state, g.game.status))
    }

    private fun LocalGame.apply(state: GameState, mutation: CloudMutation, status: GameStatus = game.status) = copy(
        game = game.copy(state = state, status = status, updatedAt = now()),
        pending = if (needsCreate) emptyList() else pending + mutation,
        lastError = null,
    )

    private suspend fun edit(code: String, change: (LocalGame) -> LocalGame) {
        mutex.withLock {
            val g = _games.value.firstOrNull { it.code == code } ?: throw EngineError("NOT_FOUND", "This game is no longer on this device.")
            if (!g.canEdit) throw EngineError("NOT_EDITOR", "Open the organizer link to edit this game.")
            val next = change(g)
            save(_games.value.map { if (it.code == code) next else it })
        }
        scope.launch { sync(code) }
    }

    /* ------------------------------------------------------------------ */
    /* Sync                                                                 */
    /* ------------------------------------------------------------------ */

    /** Push pending changes of every game, then pull the latest state of live games. */
    @Throws(CancellationException::class)
    suspend fun syncAll() {
        for (g in _games.value) sync(g.code)
    }

    /** Pull the server state (spectators and idle organizers). */
    @Throws(CancellationException::class)
    suspend fun refresh(code: String) = sync(code)

    private val syncing = Mutex()

    /**
     * Sends pending work for one game. Network failures leave the queue for next time; a server
     * rejection drops that change and adopts the server state (someone else changed the game).
     */
    @Throws(CancellationException::class)
    suspend fun sync(code: String) {
        syncCode(code)
    }

    /** [sync], returning the game's code afterwards (registration replaces a provisional code). */
    private suspend fun syncCode(code: String): String = syncing.withLock {
        var g = game(code) ?: return code
        try {
            if (g.needsCreate) g = register(g)
            val key = g.organizerKey
            while (key != null) {
                val op = game(g.code)?.pending?.firstOrNull() ?: break
                val result = try {
                    api.mutate(g.code, key, op).game
                } catch (e: ApiException) {
                    if (!e.isRejection) throw e
                    val server = api.fetch(g.code)
                    replaceWith(g.code) { it.copy(game = server ?: it.game, pending = emptyList(), lastError = e.message) }
                    return g.code
                }
                replaceWith(g.code) { cur ->
                    val rest = cur.pending.drop(1)
                    // Keep optimistic local state while more edits are queued; adopt the server's otherwise.
                    cur.copy(game = if (rest.isEmpty()) result else cur.game, pending = rest, lastSyncedAt = now())
                }
            }
            val fresh = game(g.code) ?: return g.code
            if (fresh.pending.isEmpty()) {
                val server = api.fetch(fresh.code) ?: return g.code
                replaceWith(fresh.code) { cur ->
                    if (cur.pending.isEmpty() && server.updatedAt >= cur.game.updatedAt - CLOCK_SKEW_MS) cur.copy(game = server, lastSyncedAt = now()) else cur
                }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: ApiException) {
            // Refused outright (e.g. rate limited or invalid): surface it; keep the work queued.
            if (e.isRejection) replaceWith(g.code) { it.copy(lastError = e.message) }
        } catch (_: Exception) {
            // Offline or server unreachable: keep everything queued.
        }
        g.code
    }

    /** Registers an offline-created game: POST create for a code and key, then `replace` with our state. */
    private suspend fun register(g: LocalGame): LocalGame {
        val players = g.game.state.players
        val created = api.create(
            CreateGameRequest(
                mode = g.game.state.settings.mode.wire(),
                names = players.map { it.name },
                courts = g.game.state.settings.courts,
                name = g.game.name,
                sides = if (modeInfo(g.game.state.settings.mode).sides) players.map { it.side?.name ?: "A" } else emptyList(),
            ),
        )
        val synced = api.mutate(created.code, created.organizerKey, CloudMutation.Replace(g.game.state, g.game.status, g.game.name)).game
        val registered = g.copy(game = synced, organizerKey = created.organizerKey, needsCreate = false, pending = emptyList(), lastSyncedAt = now())
        renamed[g.code] = created.code
        mutex.withLock {
            // Edits made while registering were applied locally (needsCreate drops their mutations): resend as replace.
            val cur = _games.value.firstOrNull { it.game.id == g.game.id } ?: return registered
            val merged = if (cur.game.updatedAt > g.game.updatedAt) {
                registered.copy(game = cur.game.copy(code = created.code, id = synced.id), pending = listOf(CloudMutation.Replace(cur.game.state, cur.game.status)))
            } else registered
            save(_games.value.map { if (it.game.id == g.game.id) merged else it })
            return merged
        }
    }

    private suspend fun replaceWith(code: String, change: (LocalGame) -> LocalGame) = mutex.withLock {
        save(_games.value.map { if (it.code == code) change(it) else it })
    }

    private suspend fun update(change: (List<LocalGame>) -> List<LocalGame>) = mutex.withLock { save(change(_games.value)) }

    private fun save(list: List<LocalGame>) {
        val sorted = list.sortedByDescending { it.game.updatedAt }
        _games.value = sorted
        store.write(STORE_KEY, PadelJson.encodeToString(ListSerializer(LocalGame.serializer()), sorted))
    }

    private fun load(): List<LocalGame> = runCatching {
        store.read(STORE_KEY)?.let { PadelJson.decodeFromString(ListSerializer(LocalGame.serializer()), it) }
    }.getOrNull() ?: emptyList()

    companion object {
        const val STORE_KEY = "padel.games.v1"
        private const val MAX_SCAN_CANDIDATES = 5
        /** Device and server clocks differ; don't discard a server state for being a few seconds "older". */
        private const val CLOCK_SKEW_MS = 5_000L
    }
}

fun interface Cancellable {
    fun cancel()
}

/**
 * Same ids and names as the server builds (apps/mcp/src/game.ts `buildPlayers`): p1…, t1… for
 * consecutive pairs, and "Anna 2" for a repeated name, so a game looks the same on every client.
 */
fun buildPlayers(mode: ModeId, names: List<String>, sides: List<Side>? = null): List<Player> {
    val info = modeInfo(mode)
    val used = mutableMapOf<String, Int>()
    return names.mapIndexed { i, raw ->
        var name = raw.trim().replace(Regex("\\s+"), " ").take(40).ifEmpty { "Player ${i + 1}" }
        val seen = used[name.lowercase()] ?: 0
        used[name.lowercase()] = seen + 1
        if (seen > 0) name = "$name ${seen + 1}"
        Player(
            id = "p${i + 1}",
            name = name,
            side = if (info.sides) sides?.getOrNull(i) ?: if (i % 2 == 0) Side.A else Side.B else null,
            teamId = if (info.teams) "t${i / 2 + 1}" else null,
        )
    }
}

/** The mode id as the API spells it ("team-americano"). */
internal fun ModeId.wire(): String = PadelJson.encodeToJsonElement(ModeId.serializer(), this).toString().trim('"')
