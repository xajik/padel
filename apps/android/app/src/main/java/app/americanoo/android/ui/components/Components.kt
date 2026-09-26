package app.americanoo.android.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import app.americanoo.android.ui.theme.PadelIcon
import app.americanoo.android.ui.theme.PadelTheme
import app.americanoo.android.ui.theme.Radius
import app.americanoo.android.ui.theme.Space
import app.americanoo.android.ui.theme.Tokens
import app.americanoo.data.GameStatus
import app.americanoo.data.LocalGame
import app.americanoo.data.SyncState
import app.americanoo.engine.GameState
import app.americanoo.engine.ModeId
import app.americanoo.engine.modeInfo

@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Button(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(Radius.md),
        modifier = modifier.fillMaxWidth().heightIn(min = Tokens.touchTarget + 4.dp),
    ) { Text(text, style = MaterialTheme.typography.labelLarge) }
}

@Composable
fun SecondaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, icon: PadelIcon? = null, enabled: Boolean = true) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(Radius.md),
        border = BorderStroke(1.dp, PadelTheme.colors.border),
        modifier = modifier.fillMaxWidth().heightIn(min = Tokens.touchTarget + 4.dp),
    ) {
        if (icon != null) {
            Icon(painterResource(icon.res), null, Modifier.size(20.dp), tint = PadelTheme.colors.foreground)
            Box(Modifier.size(Space.s2))
        }
        Text(text, style = MaterialTheme.typography.labelLarge, color = PadelTheme.colors.foreground)
    }
}

/** Bordered surface card, the web's `Card`. */
@Composable
fun PadelCard(modifier: Modifier = Modifier, padding: Dp = Space.s4, onClick: (() -> Unit)? = null, content: @Composable () -> Unit) {
    val shape = RoundedCornerShape(Radius.lg)
    if (onClick != null) {
        Surface(onClick = onClick, shape = shape, color = PadelTheme.colors.surface, border = BorderStroke(1.dp, PadelTheme.colors.border), modifier = modifier.fillMaxWidth()) {
            Box(Modifier.padding(padding)) { content() }
        }
    } else {
        Surface(shape = shape, color = PadelTheme.colors.surface, border = BorderStroke(1.dp, PadelTheme.colors.border), modifier = modifier.fillMaxWidth()) {
            Box(Modifier.padding(padding)) { content() }
        }
    }
}

@Composable
fun SectionTitle(text: String, trailing: String? = null) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(text, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
        if (trailing != null) Text(trailing, style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground)
    }
}

/** *Live · view only*, *offline · 2 changes waiting* (FR-2.10). */
@Composable
fun StatusLine(game: LocalGame) {
    val parts = mutableListOf(if (game.game.status == GameStatus.Done) "Finished" else "Live")
    if (!game.canEdit) parts += "view only"
    when (game.sync) {
        SyncState.LocalOnly -> parts += "on this phone — shares when online"
        SyncState.Pending -> parts += "offline · ${game.pending.size} change${if (game.pending.size == 1) "" else "s"} waiting"
        SyncState.Synced -> Unit
    }
    val live = game.game.status == GameStatus.Live && game.sync == SyncState.Synced
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
        Box(Modifier.size(7.dp).background(if (live) PadelTheme.colors.foreground else PadelTheme.colors.mutedForeground, CircleShape))
        Text(parts.joinToString(" · "), style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground)
    }
}

/** Same mapping as the web mode cards. */
fun ModeId.icon() = when (this) {
    ModeId.Americano -> PadelIcon.Rotate
    ModeId.TeamAmericano, ModeId.TeamMexicano -> PadelIcon.Pair
    ModeId.Mexicano -> PadelIcon.Ladder
    ModeId.Mixicano -> PadelIcon.Mixed
    ModeId.BeatTheBox -> PadelIcon.Box
    ModeId.UpAndDown, ModeId.TeamUpAndDown -> PadelIcon.Updown
}

@Composable
fun PadelIconView(icon: PadelIcon, size: Dp = Tokens.iconSize, modifier: Modifier = Modifier) =
    Icon(painterResource(icon.res), contentDescription = null, modifier = modifier.size(size))

fun GameState.name(id: String) = players.firstOrNull { it.id == id }?.name ?: "?"
fun GameState.team(ids: List<String>) = ids.joinToString(" & ") { name(it) }
val GameState.modeName get() = modeInfo(settings.mode).name
val GameState.roundLabel get() = "Round ${current + 1}" + (plannedRounds?.let { " of $it" } ?: "")

fun formatScore(v: Double): String = if (v % 1.0 == 0.0) v.toLong().toString() else "%.1f".format(v)

/** Chip-like selectable box used for points, rounds and formats. */
@Composable
fun RowScope.Choice(text: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(Radius.md),
        color = if (selected) PadelTheme.colors.primary else PadelTheme.colors.surface,
        contentColor = if (selected) PadelTheme.colors.primaryForeground else PadelTheme.colors.foreground,
        border = BorderStroke(1.dp, if (selected) PadelTheme.colors.primary else PadelTheme.colors.border),
        modifier = Modifier.weight(1f).heightIn(min = Tokens.touchTarget),
    ) {
        Box(contentAlignment = Alignment.Center) { Text(text, style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(horizontal = Space.s2)) }
    }
}

@Composable
fun Modifier.outlined() = this.border(1.dp, PadelTheme.colors.border, RoundedCornerShape(Radius.md))
