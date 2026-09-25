package app.padel.android.live

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import app.padel.android.MainActivity
import app.padel.android.R
import app.padel.android.ui.components.formatScore
import app.padel.android.ui.components.team
import app.padel.data.GameStatus
import app.padel.data.LocalGame
import app.padel.engine.computeStandings
import app.padel.engine.isScored
import app.padel.engine.modeInfo

/**
 * Android counterpart of the iOS Live Activity: an ongoing notification for a followed game with
 * the round, every court's score and the leader. On Android 16+ it is a promoted *Live Update*
 * (progress segments per round, status-bar chip). Updated whenever the game changes on this
 * phone or through polling; updates while the app is closed would need push (FCM).
 */
object GameNotifications {
    private const val CHANNEL = "live-game"
    private const val PREFS = "padel-live"

    fun createChannel(context: Context) {
        val channel = NotificationChannel(CHANNEL, "Live game", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "The round and scores of a game you follow."
            setSound(null, null)
            enableVibration(false)
        }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    fun canPost(context: Context) =
        Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    private fun followed(context: Context): Set<String> =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getStringSet("codes", emptySet())!!

    private fun setFollowed(context: Context, codes: Set<String>) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putStringSet("codes", codes).apply()

    fun isFollowing(context: Context, code: String) = code in followed(context)

    fun toggle(context: Context, game: LocalGame) {
        if (isFollowing(context, game.code)) {
            setFollowed(context, followed(context) - game.code)
            NotificationManagerCompat.from(context).cancel(game.code.hashCode())
        } else {
            setFollowed(context, followed(context) + game.code)
            post(context, game)
        }
    }

    /** Keep followed games' notifications current; finishing a game posts the result and stops. */
    fun sync(context: Context, games: List<LocalGame>) {
        val codes = followed(context)
        if (codes.isEmpty()) return
        val byCode = games.associateBy { it.code }
        for (code in codes) {
            val g = byCode[code]
            if (g == null) {
                NotificationManagerCompat.from(context).cancel(code.hashCode())
                setFollowed(context, followed(context) - code)
            } else {
                post(context, g)
                if (g.game.status == GameStatus.Done) setFollowed(context, followed(context) - code)
            }
        }
    }

    private fun post(context: Context, g: LocalGame) {
        if (!canPost(context)) return
        val state = g.game.state
        val round = state.rounds[state.current]
        val done = g.game.status == GameStatus.Done
        val roundLabel = "Round ${state.current + 1}" + (state.plannedRounds?.let { " of $it" } ?: "")
        val courts = round.matches.map { m ->
            "Court ${m.court}: ${state.team(m.teamA)} v ${state.team(m.teamB)} " + if (isScored(m)) "${m.scoreA}–${m.scoreB}" else "· in play"
        }
        val leader = computeStandings(state).firstOrNull()
        val title = "${g.game.name} · ${if (done) "Finished" else roundLabel}"
        val summary = "${round.matches.count(::isScored)}/${round.matches.size} courts scored" + (leader?.let { " · leader ${it.name} ${formatScore(it.score)}" } ?: "")
        val body = (courts + listOfNotNull(leader?.let { "Leader: ${it.name} · ${formatScore(it.score)}" })).joinToString("\n")
        val open = PendingIntent.getActivity(
            context, g.code.hashCode(),
            Intent(Intent.ACTION_VIEW, Uri.parse("padel://g/${g.code}"), context, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        val notification: Notification = if (Build.VERSION.SDK_INT >= 36 && !done) {
            // Android 16 Live Update: segments per round, progress = rounds played.
            val planned = state.plannedRounds ?: (state.current + 1)
            val style = Notification.ProgressStyle()
                .setProgressSegments(List(planned) { Notification.ProgressStyle.Segment(1) })
                .setProgress(state.current)
                .setStyledByProgress(true)
            Notification.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_racket)
                .setContentTitle(title)
                .setContentText(summary)
                .setStyle(style)
                .setShortCriticalText("R${state.current + 1}")
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setContentIntent(open)
                .setCategory(Notification.CATEGORY_PROGRESS)
                .addExtras(android.os.Bundle().apply { putBoolean("android.requestPromotedOngoing", true) })
                .build()
        } else {
            NotificationCompat.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_racket)
                .setContentTitle(title)
                .setContentText(summary)
                .setSubText(modeInfo(state.settings.mode).name)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setOngoing(!done)
                .setOnlyAlertOnce(true)
                .setContentIntent(open)
                .setCategory(NotificationCompat.CATEGORY_PROGRESS)
                .build()
        }
        try {
            NotificationManagerCompat.from(context).notify(g.code.hashCode(), notification)
        } catch (_: SecurityException) {
            // Permission revoked between check and post.
        }
    }
}
