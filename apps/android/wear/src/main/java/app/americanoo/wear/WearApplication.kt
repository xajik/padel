package app.americanoo.wear

import android.app.Application
import android.content.Context
import app.americanoo.data.GameRepository
import app.americanoo.data.KeyValueStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

class WearApplication : Application() {
    /** The watch keeps its own copy of the games and syncs with the server directly (Wi‑Fi, LTE or the phone's connection). */
    lateinit var repository: GameRepository
        private set

    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    override fun onCreate() {
        super.onCreate()
        repository = GameRepository(BASE_URL, PrefsStore(this))
        // Keys of games started here go to the phone; keys the phone already sent are picked up now.
        appScope.launch {
            repository.games.map { repository.encodeKeys() }.distinctUntilChanged().collect { KeySync.publish(this@WearApplication, KeySync.WATCH, it) }
        }
        appScope.launch { KeySync.read(this@WearApplication, KeySync.PHONE)?.let { repository.importKeys(repository.decodeKeys(it)) } }
    }

    companion object {
        val BASE_URL: String = BuildConfig.PADEL_BASE_URL
    }
}

val Context.padel: WearApplication get() = applicationContext as WearApplication

/** SharedPreferences-backed store for the shared repository. */
class PrefsStore(context: Context) : KeyValueStore {
    private val prefs = context.getSharedPreferences("padel", Context.MODE_PRIVATE)
    override fun read(key: String): String? = prefs.getString(key, null)
    override fun write(key: String, value: String?) {
        prefs.edit().apply { if (value == null) remove(key) else putString(key, value) }.apply()
    }
}
