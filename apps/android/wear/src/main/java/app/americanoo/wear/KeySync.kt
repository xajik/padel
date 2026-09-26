package app.americanoo.wear

import android.content.Context
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * Organizer keys shared between the phone and the watch over the Wear Data Layer, so games started on
 * either one can be scored on both. Each side writes its own path; the phone app has the mirror image.
 */
object KeySync {
    const val PHONE = "/keys/phone"
    const val WATCH = "/keys/watch"
    private const val KEYS = "keys"

    suspend fun publish(context: Context, path: String, json: String) {
        val request = PutDataMapRequest.create(path).apply { dataMap.putString(KEYS, json) }.asPutDataRequest().setUrgent()
        runCatching { Wearable.getDataClient(context).putDataItem(request).await() }
    }

    /** The latest keys the other device wrote, if any (for keys sent while this app wasn't running). */
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
        val json = KeySync.keys(events, KeySync.PHONE) ?: return
        val repo = padel.repository
        padel.appScope.launch { repo.importKeys(repo.decodeKeys(json)) }
    }
}
