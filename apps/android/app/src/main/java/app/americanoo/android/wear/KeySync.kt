package app.americanoo.android.wear

import android.content.Context
import app.americanoo.android.padel
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * Organizer keys shared with the Wear OS app over the Data Layer, so games started on either device can
 * be scored on both. Mirror of apps/android/wear/…/KeySync.kt; each side writes its own path.
 */
object KeySync {
    const val PHONE = "/keys/phone"
    const val WATCH = "/keys/watch"
    private const val KEYS = "keys"

    suspend fun publish(context: Context, path: String, json: String) {
        val request = PutDataMapRequest.create(path).apply { dataMap.putString(KEYS, json) }.asPutDataRequest().setUrgent()
        runCatching { Wearable.getDataClient(context).putDataItem(request).await() }
    }

    suspend fun read(context: Context, path: String): String? = runCatching {
        val items = Wearable.getDataClient(context).dataItems.await()
        try {
            items.firstOrNull { it.uri.path == path }?.let { DataMapItem.fromDataItem(it).dataMap.getString(KEYS) }
        } finally {
            items.release()
        }
    }.getOrNull()

    fun keys(events: DataEventBuffer, path: String): String? = events
        .filter { it.type == DataEvent.TYPE_CHANGED && it.dataItem.uri.path == path }
        .lastOrNull()?.let { DataMapItem.fromDataItem(it.dataItem).dataMap.getString(KEYS) }
}

class KeySyncService : WearableListenerService() {
    override fun onDataChanged(events: DataEventBuffer) {
        val json = KeySync.keys(events, KeySync.WATCH) ?: return
        val repo = padel.repository
        padel.appScope.launch { repo.importKeys(repo.decodeKeys(json)) }
    }
}
