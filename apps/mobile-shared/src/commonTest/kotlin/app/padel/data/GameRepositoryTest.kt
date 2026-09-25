package app.padel.data

import app.padel.engine.ModeId
import app.padel.engine.createGame
import app.padel.engine.defaultSettings
import app.padel.engine.isScored
import app.padel.engine.nextRound
import app.padel.engine.setScore
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.respond
import io.ktor.client.request.HttpRequestData
import io.ktor.client.request.HttpResponseData
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.OutgoingContent
import io.ktor.http.headersOf
import kotlinx.io.IOException
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** In-memory stand-in for the cloud API (apps/mcp), applying mutations with the same engine. */
private class FakeServer {
    var online = true
    val games = mutableMapOf<String, StoredGame>()
    val keys = mutableMapOf<String, String>()
    private var clock = 1_000L

    val engine = MockEngine { req -> handle(req) }

    private fun MockRequestHandleScope.json(body: String, status: HttpStatusCode = HttpStatusCode.OK): HttpResponseData =
        respond(body, status, headersOf(HttpHeaders.ContentType, "application/json"))

    private fun MockRequestHandleScope.error(code: String, status: HttpStatusCode) =
        json("""{"error":{"code":"$code","message":"$code"}}""", status)

    private fun MockRequestHandleScope.handle(req: HttpRequestData): HttpResponseData {
        if (!online) throw IOException("offline")
        val path = req.url.encodedPath.trim('/').split('/')
        val body = (req.body as? OutgoingContent.ByteArrayContent)?.bytes()?.decodeToString() ?: ""
        if (path == listOf("api", "v1", "games") && req.method == HttpMethod.Post) {
            val input = PadelJson.decodeFromString(CreateGameRequest.serializer(), body)
            val mode = ModeId.entries.first { it.wire() == input.mode }
            val code = GameLinks.newCode()
            val state = createGame(defaultSettings(mode, input.names.size).copy(courts = input.courts), buildPlayers(mode, input.names), "server")
            games[code] = StoredGame("id-$code", code, input.name, "mcp:x", GameStatus.Live, "mcp", clock, clock++, state)
            keys[code] = "key-$code"
            return json("""{"code":"$code","organizerKey":"key-$code"}""", HttpStatusCode.Created)
        }
        val code = path.getOrNull(2) ?: return error("NOT_FOUND", HttpStatusCode.NotFound)
        val g = games[code] ?: return error("NOT_FOUND", HttpStatusCode.NotFound)
        val keyOk = req.headers["X-Organizer-Key"] == keys[code]
        return when (path.getOrNull(3)) {
            null -> json(PadelJson.encodeToString(GameEnvelope.serializer(), GameEnvelope(g)))
            "redeem" -> json("""{"editor":$keyOk}""")
            "mutate" -> {
                if (!keyOk) return error("NOT_EDITOR", HttpStatusCode.Forbidden)
                val m = PadelJson.decodeFromString(CloudMutation.serializer(), body)
                val next = try {
                    apply(g, m)
                } catch (e: Exception) {
                    return error("INVALID", HttpStatusCode.Conflict)
                }
                games[code] = next
                json(PadelJson.encodeToString(MutateResponse.serializer(), MutateResponse(next)))
            }
            else -> error("NOT_FOUND", HttpStatusCode.NotFound)
        }
    }

    fun apply(g: StoredGame, m: CloudMutation): StoredGame {
        if (g.status == GameStatus.Done && m !is CloudMutation.Reopen) error("GAME_FINISHED")
        val t = clock++
        return when (m) {
            is CloudMutation.Score -> {
                val r = m.round - 1
                val idx = g.state.rounds[r].matches.indexOfFirst { it.court == m.court }
                g.copy(state = setScore(g.state, r, idx, m.scoreA, m.scoreB).state, updatedAt = t)
            }
            CloudMutation.Next -> g.copy(state = nextRound(g.state), updatedAt = t)
            CloudMutation.Finish -> g.copy(status = GameStatus.Done, updatedAt = t)
            CloudMutation.Reopen -> g.copy(status = GameStatus.Live, updatedAt = t)
            is CloudMutation.Replace -> g.copy(state = m.state, status = m.status, name = m.name ?: g.name, updatedAt = t)
        }
    }
}

class GameRepositoryTest {
    private val names = listOf("Anna", "Mikko", "Laura", "Jussi", "Sara", "Pekka", "Emma", "Olli")
    private val server = FakeServer()
    private var time = 10_000L
    private fun repo(store: KeyValueStore = MemoryStore()) =
        GameRepository(PadelApi("https://padel.test", server.engine), store, now = { time++ })

    private suspend fun GameRepository.scoreRound(code: String) {
        val g = game(code)!!.game.state
        g.rounds[g.current].matches.indices.forEach { score(code, g.current, it, 15, null) }
    }

    @Test
    fun createOnlineRegistersWithOurSchedule() = runTest {
        val repo = repo()
        val g = repo.create("Tuesday", defaultSettings(ModeId.Americano, 8), names)
        assertFalse(g.needsCreate)
        assertEquals("key-${g.code}", g.organizerKey)
        assertEquals(SyncState.Synced, g.sync)
        // The phone's seeded schedule wins over the server's own, so both show the same rounds.
        assertEquals(g.game.state, server.games.getValue(g.code).state)
        assertEquals("Tuesday", server.games.getValue(g.code).name)
    }

    @Test
    fun offlineGameAndScoresSyncLater() = runTest {
        server.online = false
        val repo = repo()
        val g = repo.create("", defaultSettings(ModeId.Mexicano, 8), names)
        assertTrue(g.needsCreate)
        assertEquals(SyncState.LocalOnly, g.sync)
        repo.scoreRound(g.code)
        repo.next(g.code)
        assertEquals(1, repo.game(g.code)!!.game.state.current)

        server.online = true
        repo.syncAll()
        val synced = repo.games.value.single()
        assertNotEquals(g.code, synced.code, "provisional code replaced by the server's")
        assertEquals(SyncState.Synced, synced.sync)
        assertEquals(synced.game.state, server.games.getValue(synced.code).state)
        assertEquals(1, server.games.getValue(synced.code).state.current)
    }

    @Test
    fun queuedEditsReachTheServerInOrder() = runTest {
        val repo = repo()
        val code = repo.create("", defaultSettings(ModeId.Americano, 8), names).code
        server.online = false
        repo.scoreRound(code)
        repo.next(code)
        repo.score(code, 1, 0, 20, null)
        assertEquals(SyncState.Pending, repo.game(code)!!.sync)
        assertEquals(4, repo.game(code)!!.pending.size)

        server.online = true
        repo.sync(code)
        val server = server.games.getValue(code)
        assertEquals(SyncState.Synced, repo.game(code)!!.sync)
        assertEquals(1, server.state.current)
        assertTrue(server.state.rounds[0].matches.all(::isScored))
        assertEquals(20, server.state.rounds[1].matches[0].scoreA)
        assertEquals(server, repo.game(code)!!.game)
    }

    @Test
    fun organizerLinkGrantsEditingAndCodeFollows() = runTest {
        val code = repo().create("", defaultSettings(ModeId.Americano, 8), names).code

        val organizer = repo()
        val o = organizer.join("https://padel-web.xajik0.workers.dev/g/$code?key=key-$code")
        assertTrue(o.canEdit)
        organizer.score(code, 0, 0, 10, null)
        organizer.sync(code)
        assertEquals(10, server.games.getValue(code).state.rounds[0].matches[0].scoreA)

        val spectator = repo()
        val s = spectator.join(code.lowercase())
        assertFalse(s.canEdit)
        assertFailsWith<app.padel.engine.EngineError> { spectator.score(code, 0, 1, 10, null) }
        spectator.refresh(code)
        assertEquals(10, spectator.game(code)!!.game.state.rounds[0].matches[0].scoreA)

        // A wrong key is ignored: joined read-only.
        assertNull(repo().join("padel://g/$code?key=nope").organizerKey)
        assertFailsWith<ApiException> { repo().join("ZZZZZZ") }
    }

    @Test
    fun serverRejectionAdoptsServerState() = runTest {
        val repo = repo()
        val code = repo.create("", defaultSettings(ModeId.Americano, 8), names).code
        // Another organizer (e.g. on the web) finishes the game while this phone is offline.
        server.games[code] = server.apply(server.games.getValue(code), CloudMutation.Finish)
        server.online = false
        repo.score(code, 0, 0, 12, null)
        server.online = true
        repo.sync(code)
        val g = repo.game(code)!!
        assertEquals(GameStatus.Done, g.game.status)
        assertNotNull(g.lastError)
        assertTrue(g.pending.isEmpty())
    }

    @Test
    fun gamesPersistAcrossLaunches() = runTest {
        val store = MemoryStore()
        val code = repo(store).create("Kept", defaultSettings(ModeId.Americano, 8), names).code
        val relaunched = repo(store)
        assertEquals("Kept", relaunched.game(code)?.game?.name)
        assertEquals(code, relaunched.activeGame()?.code)
    }
}

class GameLinksTest {
    @Test
    fun parsesEverythingPeopleShare() {
        assertEquals(JoinTarget("K7Q2MX"), GameLinks.parse("K7Q2MX"))
        assertEquals(JoinTarget("K7Q2MX"), GameLinks.parse("  k7q2mx "))
        assertEquals(JoinTarget("K7Q2MX"), GameLinks.parse("https://padel-web.xajik0.workers.dev/g/K7Q2MX"))
        assertEquals(JoinTarget("K7Q2MX"), GameLinks.parse("https://padel-web.xajik0.workers.dev/g/K7Q2MX/tv"))
        assertEquals(JoinTarget("K7Q2MX", "a%b"), GameLinks.parse("https://x.dev/g/K7Q2MX?key=a%25b"))
        assertEquals(JoinTarget("K7Q2MX", "3wOuAP0s"), GameLinks.parse("padel://g/K7Q2MX?key=3wOuAP0s"))
        assertEquals(JoinTarget("K7Q2MX"), GameLinks.parse("https://x.dev/join?code=K7Q2MX"))
        assertNull(GameLinks.parse("https://x.dev/modes/americano"))
        assertNull(GameLinks.parse("OOOOOO"), "O is not in the alphabet")
        assertNull(GameLinks.parse(""))
        assertEquals("https://x.dev/g/K7Q2MX?key=k", GameLinks.organizerUrl("https://x.dev/", "K7Q2MX", "k"))
    }

    @Test
    fun playersMatchTheServer() {
        val ps = buildPlayers(ModeId.TeamAmericano, listOf("Anna", "anna", " Bo  Li ", ""))
        assertEquals(listOf("p1", "p2", "p3", "p4"), ps.map { it.id })
        assertEquals(listOf("Anna", "anna 2", "Bo Li", "Player 4"), ps.map { it.name })
        assertEquals(listOf("t1", "t1", "t2", "t2"), ps.map { it.teamId })
    }
}
