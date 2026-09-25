package app.padel.data

import app.padel.engine.GameState
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlin.native.ObjCName

/** Mirrors apps/web/lib/games/types.ts `StoredGame` and the cloud `PublicGame` (same JSON). */
@Serializable
data class StoredGame(
    val id: String,
    val code: String,
    val name: String,
    val ownerUid: String,
    val status: GameStatus,
    val source: String,
    val createdAt: Long,
    val updatedAt: Long,
    val state: GameState,
)

@Serializable
enum class GameStatus {
    @SerialName("live") Live,
    @SerialName("done") Done,
}

/** Mutations accepted by `POST /api/games/{code}/mutate` (apps/mcp/src/store.ts). */
@Serializable
sealed class CloudMutation {
    @Serializable @SerialName("score")
    data class Score(val court: Int, val scoreA: Int?, val scoreB: Int?, val round: Int) : CloudMutation()

    @Serializable @SerialName("next") data object Next : CloudMutation()

    @Serializable @SerialName("finish") data object Finish : CloudMutation()

    @Serializable @SerialName("reopen") data object Reopen : CloudMutation()

    @Serializable @SerialName("replace")
    data class Replace(val state: GameState, val status: GameStatus, val name: String? = null) : CloudMutation()
}

/** `POST /api/v1/games` body (apps/mcp/src/schemas.ts `createGameInput`). */
@Serializable
internal data class CreateGameRequest(
    val mode: String,
    val names: List<String>,
    val courts: Int,
    val name: String,
    /** Mixicano only; the API rejects `null`, so other formats send an empty list. */
    val sides: List<String> = emptyList(),
)

@Serializable
internal data class CreatedGame(val code: String, val organizerKey: String)

@Serializable
internal data class GameEnvelope(val game: StoredGame)

@Serializable
internal data class MutateResponse(val game: StoredGame, val regenerated: List<Int> = emptyList())

@Serializable
internal data class RedeemResponse(val editor: Boolean)

@Serializable
internal data class ErrorEnvelope(val error: ErrorBody) {
    @Serializable
    data class ErrorBody(val code: String, val message: String)
}

/** A game as this device knows it: the last known state plus what still has to reach the server. */
@Serializable
data class LocalGame(
    val game: StoredGame,
    /** Present when this device may edit the game (creator, or joined with an organizer link). */
    val organizerKey: String? = null,
    /** Created offline: not registered with the server yet, so it has a provisional code. */
    val needsCreate: Boolean = false,
    /** Changes applied locally, in order, waiting to be sent. */
    val pending: List<CloudMutation> = emptyList(),
    val lastSyncedAt: Long? = null,
    /** Last server rejection, shown to the organizer (e.g. another editor finished the game). */
    val lastError: String? = null,
) {
    val code: String get() = game.code
    val canEdit: Boolean get() = organizerKey != null || needsCreate

    @ObjCName("syncState")
    val sync: SyncState
        get() = when {
            needsCreate -> SyncState.LocalOnly
            pending.isNotEmpty() -> SyncState.Pending
            else -> SyncState.Synced
        }
}

/** The *Synced / Offline / Syncing* pill (FR-2.10). */
enum class SyncState { Synced, Pending, @ObjCName("localOnly") LocalOnly }

class ApiException(val code: String, message: String, val status: Int) : Exception(message) {
    /** The server understood and refused: retrying the same request won't help. */
    val isRejection: Boolean get() = status in 400..499 && status != 408 && status != 429
}
