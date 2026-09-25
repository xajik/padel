package app.padel.android

import android.app.Application
import android.content.Context
import app.padel.android.live.GameNotifications
import app.padel.android.widget.ActiveGameWidget
import app.padel.data.GameRepository
import app.padel.data.KeyValueStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch

class PadelApplication : Application() {
    /** Same deployment as the web app, so links, codes and QR codes work across both. */
    lateinit var repository: GameRepository
        private set


    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    override fun onCreate() {
        super.onCreate()
        repository = GameRepository(BASE_URL, PrefsStore(this))
        GameNotifications.createChannel(this)
        // Mirror the active game into the home-screen widget and the Live Update notification.
        appScope.launch {
            repository.games.debounce(300).distinctUntilChanged().collect { games ->
                ActiveGameWidget.refresh(this@PadelApplication)
                GameNotifications.sync(this@PadelApplication, games)
            }
        }
    }

    companion object {
        const val BASE_URL = "https://padel-web.xajik0.workers.dev"
    }
}

val Context.padel: PadelApplication get() = applicationContext as PadelApplication

/** SharedPreferences-backed store for the shared repository. */
class PrefsStore(context: Context) : KeyValueStore {
    private val prefs = context.getSharedPreferences("padel", Context.MODE_PRIVATE)
    override fun read(key: String): String? = prefs.getString(key, null)
    override fun write(key: String, value: String?) {
        prefs.edit().apply { if (value == null) remove(key) else putString(key, value) }.apply()
    }
}
