package app.americanoo.android

import android.content.Context
import android.util.Log
import com.amplitude.android.Amplitude
import com.amplitude.android.AutocaptureOption
import com.amplitude.android.Configuration

/** Amplitude product analytics (NFR-12), with the same event names as the web app. Never send player names. */
object Analytics {
    enum class Event(val type: String) {
        CreatedGame("Created Game"),
        JoinedGame("Joined Game"),
        EnteredScore("Entered Score"),
        StartedRound("Started Round"),
        FinishedGame("Finished Game"),
        OpenedShare("Opened Share"),
    }

    private var client: Amplitude? = null

    fun start(context: Context) {
        if (client != null) return
        val key = BuildConfig.AMPLITUDE_API_KEY
        if (key.isEmpty()) {
            Log.w("Analytics", "Amplitude API key missing — analytics disabled")
            return
        }
        // No element interactions: button labels can carry player names.
        client = Amplitude(
            Configuration(
                apiKey = key,
                context = context.applicationContext,
                autocapture = setOf(AutocaptureOption.SESSIONS, AutocaptureOption.APP_LIFECYCLES, AutocaptureOption.SCREEN_VIEWS),
            ),
        )
    }

    fun track(event: Event, props: Map<String, Any?> = emptyMap()) {
        client?.track(event.type, props)
    }
}
