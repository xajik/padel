package app.americanoo.data

import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.Serializable
import kotlin.coroutines.resume

/**
 * The Firebase ID token of the current user (signed in, or the silent anonymous session), or null
 * when there is none. Each app implements it over its Firebase Auth SDK; [PadelApi] sends it as
 * `Authorization: Bearer <idToken>`, so games land in the user's account and the owner can edit
 * them on any device (apps/mcp/src/auth.ts). Callback-based so Swift can implement it.
 */
fun interface AuthTokens {
    fun idToken(callback: (String?) -> Unit)
}

internal suspend fun AuthTokens.token(): String? = withTimeoutOrNull(TOKEN_TIMEOUT_MS) {
    suspendCancellableCoroutine { cont -> idToken { t -> if (cont.isActive) cont.resume(t) } }
}

private const val TOKEN_TIMEOUT_MS = 10_000L

/** A game in the signed-in user's account (`GET /api/me/games`). */
@Serializable
data class AccountGame(
    val code: String,
    val name: String,
    /** "owner" or "editor". */
    val role: String,
    val status: GameStatus,
    val modeName: String = "",
    val updatedAt: Long = 0,
)

@Serializable
internal data class AccountGamesResponse(val games: List<AccountGame>)

@Serializable
internal data class IssuedKey(val organizerKey: String)

@Serializable
internal data class MergeRequest(val fromIdToken: String)

@Serializable
internal data class MergeResponse(val moved: Int = 0)

@Serializable
internal data class DeletedResponse(val deleted: Boolean = true)
