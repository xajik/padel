package app.americanoo.android

import android.app.Application
import android.content.Context
import app.americanoo.android.live.GameNotifications
import app.americanoo.android.wear.KeySync
import app.americanoo.android.widget.ActiveGameWidget
import app.americanoo.data.GameRepository
import app.americanoo.data.KeyValueStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
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
        // Organizer keys go to the Wear OS app; games started on the watch come back editable.
        appScope.launch {
            repository.games.map { repository.encodeKeys() }.distinctUntilChanged().collect { KeySync.publish(this@PadelApplication, KeySync.PHONE, it) }
        }
        appScope.launch { KeySync.read(this@PadelApplication, KeySync.WATCH)?.let { repository.importKeys(repository.decodeKeys(it)) } }
    }

    companion object {
        val BASE_URL: String = BuildConfig.PADEL_BASE_URL
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
