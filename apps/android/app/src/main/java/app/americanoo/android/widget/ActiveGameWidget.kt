package app.americanoo.android.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.ColorFilter
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import app.americanoo.android.MainActivity
import app.americanoo.android.R
import app.americanoo.android.padel
import app.americanoo.android.ui.components.formatScore
import app.americanoo.android.ui.components.team
import app.americanoo.android.ui.theme.DarkPalette
import app.americanoo.android.ui.theme.LightPalette
import app.americanoo.data.GameStatus
import app.americanoo.data.LocalGame
import app.americanoo.engine.computeStandings
import app.americanoo.engine.isScored

/** Home-screen widget: the game you're running or following (round, courts, leaders). */
class ActiveGameWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Responsive(setOf(DpSize(140.dp, 110.dp), DpSize(260.dp, 110.dp), DpSize(260.dp, 200.dp)))

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val game = context.padel.repository.activeGame()
        provideContent { GlanceTheme { Content(context, game) } }
    }

    companion object {
        suspend fun refresh(context: Context) = ActiveGameWidget().updateAll(context)
    }
}

class ActiveGameWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = ActiveGameWidget()
}

private val bg = ColorProvider(LightPalette.background, DarkPalette.background)
private val fg = ColorProvider(LightPalette.foreground, DarkPalette.foreground)
private val muted = ColorProvider(LightPalette.mutedForeground, DarkPalette.mutedForeground)

@Composable
private fun Content(context: Context, g: LocalGame?) {
    val open = Intent(Intent.ACTION_VIEW, Uri.parse(g?.let { "americanoo://g/${it.code}" } ?: "americanoo://home"), context, MainActivity::class.java)
    Column(
        GlanceModifier.fillMaxSize().background(bg).cornerRadius(20.dp).padding(14.dp).clickable(actionStartActivity(open)),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Image(ImageProvider(R.drawable.ic_logo), null, GlanceModifier.size(18.dp), colorFilter = ColorFilter.tint(fg))
            Spacer(GlanceModifier.width(6.dp))
            Text(g?.game?.name ?: "Padel", style = TextStyle(color = fg, fontSize = 14.sp, fontWeight = FontWeight.Bold), maxLines = 1)
        }
        Spacer(GlanceModifier.height(4.dp))
        if (g == null) {
            Text("No game running. Start or join one.", style = TextStyle(color = muted, fontSize = 12.sp))
            return@Column
        }
        val state = g.game.state
        val round = state.rounds[state.current]
        val status = if (g.game.status == GameStatus.Done) "Finished" else "Round ${state.current + 1}" + (state.plannedRounds?.let { " of $it" } ?: "")
        val wide = LocalSize.current.width >= 260.dp
        // Narrow widget: the round alone, so the line doesn't wrap.
        Text(if (wide) "$status · ${round.matches.count(::isScored)}/${round.matches.size} scored" else status, style = TextStyle(color = muted, fontSize = 12.sp), maxLines = 1)
        Spacer(GlanceModifier.height(8.dp))
        val tall = LocalSize.current.height >= 200.dp
        if (wide) {
            round.matches.take(if (tall) 4 else 2).forEach { m ->
                Row(GlanceModifier.fillMaxWidth().padding(bottom = 3.dp)) {
                    Text("C${m.court}  ${state.team(m.teamA)} v ${state.team(m.teamB)}", GlanceModifier.defaultWeight(), style = TextStyle(color = fg, fontSize = 12.sp), maxLines = 1)
                    Text(if (isScored(m)) "${m.scoreA}–${m.scoreB}" else "–", style = TextStyle(color = fg, fontSize = 12.sp, fontWeight = FontWeight.Bold))
                }
            }
        }
        if (!wide || tall) {
            computeStandings(state).take(if (tall) 3 else 3).forEach { s ->
                Row(GlanceModifier.fillMaxWidth()) {
                    Text("${s.rank}  ${s.name}", GlanceModifier.defaultWeight(), style = TextStyle(color = fg, fontSize = 12.sp), maxLines = 1)
                    Text(formatScore(s.score), style = TextStyle(color = fg, fontSize = 12.sp, fontWeight = FontWeight.Bold))
                }
            }
        }
    }
}
