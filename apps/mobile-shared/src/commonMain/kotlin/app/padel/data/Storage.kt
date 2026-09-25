package app.padel.data

/**
 * Tiny persistent key-value store supplied by each app: UserDefaults (in the App Group, so
 * widgets and Live Activities can read it) on iOS, SharedPreferences on Android.
 */
interface KeyValueStore {
    fun read(key: String): String?
    fun write(key: String, value: String?)
}

class MemoryStore : KeyValueStore {
    private val map = mutableMapOf<String, String>()
    override fun read(key: String) = map[key]
    override fun write(key: String, value: String?) {
        if (value == null) map.remove(key) else map[key] = value
    }
}
