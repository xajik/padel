package app.padel.android

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.padel.data.GameLinks
import app.padel.data.LocalGame
import app.padel.engine.EngineError
import app.padel.engine.Settings
import app.padel.engine.Side
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/** App state over the shared repository: the games, navigation events, polling and messages. */
class AppViewModel(app: Application) : AndroidViewModel(app) {
    val repo = app.padel.repository
    val games: StateFlow<List<LocalGame>> = repo.games.stateIn(viewModelScope, SharingStarted.Eagerly, repo.games.value)

    /** The game on screen, synced every few seconds like the web's live view. */
    val openCode = MutableStateFlow<String?>(null)
    val message = MutableStateFlow<String?>(null)
    private val _navigate = MutableSharedFlow<String>(extraBufferCapacity = 4)
    /** Game codes to open (after create/join/deep link). */
    val navigate = _navigate.asSharedFlow()

    private var polling: Job? = null

    fun startPolling() {
        polling?.cancel()
        polling = viewModelScope.launch {
            var tick = 0
            while (isActive) {
                openCode.value?.let { repo.sync(it) }
                if (tick++ % 8 == 0) repo.syncAll()
                delay(4_000)
            }
        }
    }

    fun stopPolling() {
        polling?.cancel()
    }

    /** Current code for a game on screen (registration replaces a provisional code). */
    fun resolve(code: String) = repo.resolve(code)

    suspend fun create(name: String, settings: Settings, names: List<String>, sides: List<Side>?): String? = try {
        val g = repo.create(name, settings, names, sides)
        _navigate.emit(g.code)
        null
    } catch (e: EngineError) {
        e.message
    }

    /** Join by code, pasted link, scanned QR or deep link; returns an error for the form. */
    suspend fun join(input: String): String? = try {
        val g = repo.join(input)
        _navigate.emit(g.code)
        null
    } catch (e: Exception) {
        e.message ?: "Could not reach the game server."
    }

    /** Join from scanned content: QR payloads and/or text recognised in a photo or the camera. */
    suspend fun joinScanned(text: String): String? = try {
        val g = repo.joinScanned(text)
        _navigate.emit(g.code)
        null
    } catch (e: Exception) {
        e.message ?: "Could not reach the game server."
    }

    fun handleLink(uri: String) {
        if (GameLinks.parse(uri) == null) return
        viewModelScope.launch { join(uri)?.let { message.value = it } }
    }

    /** Runs an edit; engine refusals become a snackbar instead of failing silently. */
    fun perform(edit: suspend () -> Unit) {
        viewModelScope.launch {
            try {
                edit()
            } catch (e: EngineError) {
                message.value = e.message
            }
        }
    }
}
