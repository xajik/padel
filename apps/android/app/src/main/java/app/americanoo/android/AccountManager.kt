package app.americanoo.android

import android.app.Activity
import android.content.Context
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import app.americanoo.data.AuthTokens
import app.americanoo.data.GameRepository
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.AuthCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthUserCollisionException
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.OAuthProvider
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * Optional sign-in (FR-3, M6): a silent anonymous Firebase session, linked to Google (Credential
 * Manager) or Apple (Firebase OAuth) when the user signs in, so their games follow them to the
 * website, other devices and AI assistants. The shared repository signs API calls with the ID token.
 */
class AccountManager(private val context: Context, private val repo: GameRepository, private val scope: CoroutineScope) {
    data class Profile(val uid: String, val name: String?, val email: String?, val isAnonymous: Boolean, val provider: String?)

    /** False in builds without google-services.json (CI, forks): the app runs without accounts. */
    val available: Boolean = FirebaseApp.getApps(context).isNotEmpty()

    private val _profile = MutableStateFlow<Profile?>(null)
    val profile: StateFlow<Profile?> = _profile.asStateFlow()
    val signedIn: Boolean get() = _profile.value?.isAnonymous == false

    private val auth: FirebaseAuth? = if (available) FirebaseAuth.getInstance() else null
    private val credentials = CredentialManager.create(context)

    fun start() {
        val auth = auth ?: return
        repo.auth = AuthTokens { callback ->
            val user = auth.currentUser ?: return@AuthTokens callback(null)
            user.getIdToken(false).addOnCompleteListener { callback(if (it.isSuccessful) it.result?.token else null) }
        }
        auth.addAuthStateListener { onUser(it.currentUser) }
    }

    private fun onUser(user: FirebaseUser?) {
        if (user == null) {
            _profile.value = null
            repo.accountUid = null
            // FR-3.1: every device has a (silent, anonymous) identity for the game API.
            auth?.signInAnonymously()
            return
        }
        _profile.value = Profile(user.uid, user.displayName, user.email, user.isAnonymous, user.providerData.firstOrNull { it.providerId != "firebase" }?.providerId)
        repo.accountUid = user.uid
        if (!user.isAnonymous) scope.launch { syncAccount() }
    }

    /** Pulls the account's games from other devices, the website and assistants. */
    suspend fun syncAccount() {
        if (!signedIn) return
        try {
            repo.syncAccount()
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // Offline: the next poll tries again.
        }
    }

    /** Returns an error message, or null on success or when the user cancelled. */
    suspend fun signInWithGoogle(activity: Activity): String? = attempt("Google") { signIn(googleCredential(activity) ?: return@attempt) }

    suspend fun signInWithApple(activity: Activity): String? = attempt("Apple") {
        val auth = auth ?: return@attempt
        val current = auth.currentUser
        if (current?.isAnonymous == true) {
            try {
                current.startActivityForLinkWithProvider(activity, appleProvider()).await()
                onUser(auth.currentUser)
            } catch (e: FirebaseAuthUserCollisionException) {
                switchToExisting(current, e.updatedCredential ?: throw e)
            }
        } else {
            auth.startActivityForSignInWithProvider(activity, appleProvider()).await()
        }
    }

    fun signOut() {
        auth?.signOut()
        scope.launch { runCatching { credentials.clearCredentialState(ClearCredentialStateRequest()) } }
    }

    /**
     * Deletes the account and its cloud games list (FR-3.7). Firebase needs a recent sign-in, so the
     * user confirms with Google or Apple first. Returns an error message, or null when deleted or cancelled.
     */
    suspend fun deleteAccount(activity: Activity, onDeleted: () -> Unit): String? = attempt("your account", deleting = true) {
        val user = auth?.currentUser?.takeUnless { it.isAnonymous } ?: return@attempt
        if (_profile.value?.provider == "apple.com") {
            user.startActivityForReauthenticateWithProvider(activity, appleProvider()).await()
        } else {
            user.reauthenticate(googleCredential(activity) ?: return@attempt).await()
        }
        repo.deleteAccountData()
        user.delete().await()
        runCatching { credentials.clearCredentialState(ClearCredentialStateRequest()) }
        onDeleted()
    }

    /** An anonymous session is linked (same UID, FR-3.3); an account that already exists takes over its games (FR-3.4). */
    private suspend fun signIn(credential: AuthCredential) {
        val auth = auth ?: return
        val current = auth.currentUser
        if (current?.isAnonymous != true) {
            auth.signInWithCredential(credential).await()
            return
        }
        try {
            current.linkWithCredential(credential).await()
            onUser(auth.currentUser)
        } catch (e: FirebaseAuthUserCollisionException) {
            switchToExisting(current, e.updatedCredential ?: credential)
        }
    }

    private suspend fun switchToExisting(anonymous: FirebaseUser, credential: AuthCredential) {
        val fromToken = runCatching { anonymous.getIdToken(false).await().token }.getOrNull()
        auth!!.signInWithCredential(credential).await()
        if (fromToken != null) runCatching { repo.mergeAnonymous(fromToken) }
        syncAccount()
    }

    private suspend fun googleCredential(activity: Activity): AuthCredential? {
        val option = GetSignInWithGoogleOption.Builder(webClientId() ?: return null).build()
        val result = credentials.getCredential(activity, GetCredentialRequest.Builder().addCredentialOption(option).build())
        val credential = result.credential
        if (credential !is CustomCredential || credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) return null
        return GoogleAuthProvider.getCredential(GoogleIdTokenCredential.createFrom(credential.data).idToken, null)
    }

    /** The OAuth web client id generated from google-services.json (absent in builds without it). */
    private fun webClientId(): String? {
        val id = context.resources.getIdentifier("default_web_client_id", "string", context.packageName)
        return if (id == 0) null else context.getString(id)
    }

    private fun appleProvider() = OAuthProvider.newBuilder("apple.com").setScopes(listOf("email", "name")).build()

    private suspend fun attempt(what: String, deleting: Boolean = false, block: suspend () -> Unit): String? = try {
        block()
        null
    } catch (e: CancellationException) {
        throw e
    } catch (_: GetCredentialCancellationException) {
        null
    } catch (e: Exception) {
        // The Apple web flow reports a closed tab as a generic web error: treat it as a cancel.
        if (e.message?.contains("canceled", ignoreCase = true) == true) null
        else if (deleting) "Couldn't delete $what. Please try again, or email us and we'll do it for you."
        else "Couldn't sign in with $what. Please try again."
    }
}
