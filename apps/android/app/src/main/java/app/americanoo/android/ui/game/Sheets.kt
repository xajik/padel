package app.americanoo.android.ui.game

import android.content.Intent
import android.graphics.Bitmap
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.americanoo.android.ui.components.Choice
import app.americanoo.android.ui.components.PadelCard
import app.americanoo.android.ui.components.PrimaryButton
import app.americanoo.android.ui.components.SecondaryButton
import app.americanoo.android.ui.components.team
import app.americanoo.android.ui.theme.GeistMono
import app.americanoo.android.ui.theme.PadelIcon
import app.americanoo.android.ui.theme.PadelTheme
import app.americanoo.android.ui.theme.Radius
import app.americanoo.android.ui.theme.Space
import app.americanoo.android.ui.theme.StateColors
import app.americanoo.android.ui.theme.TabularNums
import app.americanoo.data.GameLinks
import app.americanoo.data.LocalGame
import app.americanoo.engine.ScoringType
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel

/** Score entry sized for a sweaty thumb (web `ScorePad`). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScorePadSheet(game: LocalGame, round: Int, match: Int, onDismiss: () -> Unit, onSave: (Int?, Int?) -> Unit) {
    val state = game.game.state
    val m = state.rounds[round].matches[match]
    val total = state.settings.scoring.points ?: 24
    var a by remember { mutableStateOf(m.scoreA) }
    var b by remember { mutableStateOf(m.scoreB) }
    val haptics = LocalHapticFeedback.current

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = PadelTheme.colors.background) {
        Column(Modifier.padding(horizontal = Space.s4).navigationBarsPadding().padding(bottom = Space.s4), verticalArrangement = Arrangement.spacedBy(Space.s3)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Court ${m.court}", Modifier.weight(1f), style = MaterialTheme.typography.titleLarge)
                if (m.scoreA != null) TextButton(onClick = { onSave(null, null) }) { Text("Clear", color = StateColors.error) }
            }
            Row(verticalAlignment = Alignment.Top) {
                ScoreSide(state.team(m.teamA), a, Modifier.weight(1f))
                Text("–", style = MaterialTheme.typography.displaySmall, color = PadelTheme.colors.mutedForeground)
                ScoreSide(state.team(m.teamB), b, Modifier.weight(1f))
            }
            when (state.settings.scoring.type) {
                ScoringType.Total -> {
                    Text("Points for ${state.team(m.teamA)}", style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground)
                    NumberGrid(0..total, a) { haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove); onSave(it, total - it) }
                }
                ScoringType.FirstTo -> {
                    Text("Who reached $total?", style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground)
                    Row(horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                        Choice(state.team(m.teamA), a == total) { a = total; if (b == total) b = null }
                        Choice(state.team(m.teamB), b == total) { b = total; if (a == total) a = null }
                    }
                    if (a == total || b == total) {
                        Text("Loser's points", style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground)
                        NumberGrid(0 until total, if (a == total) b else a) { v -> if (a == total) onSave(total, v) else onSave(v, total) }
                    }
                }
                ScoringType.Off -> Row(horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                    Choice("${state.team(m.teamA)} won", a == 1) { onSave(1, 0) }
                    Choice("Draw", a == 0 && b == 0) { onSave(0, 0) }
                    Choice("${state.team(m.teamB)} won", b == 1) { onSave(0, 1) }
                }
                ScoringType.Timed -> {
                    Stepper(state.team(m.teamA), a ?: 0) { a = it }
                    Stepper(state.team(m.teamB), b ?: 0) { b = it }
                    PrimaryButton("Save score", { onSave(a ?: 0, b ?: 0) })
                }
            }
        }
    }
}

@Composable
private fun ScoreSide(name: String, score: Int?, modifier: Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(score?.toString() ?: "–", style = MaterialTheme.typography.displayLarge.merge(TabularNums).copy(fontSize = 56.sp))
        Text(name, style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground, textAlign = TextAlign.Center)
    }
}

@Composable
private fun NumberGrid(range: IntRange, selected: Int?, onPick: (Int) -> Unit) {
    LazyVerticalGrid(GridCells.Fixed(5), Modifier.heightIn(max = 460.dp), horizontalArrangement = Arrangement.spacedBy(Space.s2), verticalArrangement = Arrangement.spacedBy(Space.s2)) {
        items(range.toList()) { v ->
            Surface(
                onClick = { onPick(v) },
                shape = RoundedCornerShape(Radius.md),
                color = if (v == selected) PadelTheme.colors.primary else PadelTheme.colors.surface,
                contentColor = if (v == selected) PadelTheme.colors.primaryForeground else PadelTheme.colors.foreground,
                border = BorderStroke(1.dp, PadelTheme.colors.border),
                modifier = Modifier.heightIn(min = 52.dp).testTag("score-$v"),
            ) {
                Text("$v", Modifier.padding(vertical = Space.s3), textAlign = TextAlign.Center, style = MaterialTheme.typography.titleLarge.merge(TabularNums))
            }
        }
    }
}

@Composable
private fun Stepper(label: String, value: Int, onChange: (Int) -> Unit) {
    PadelCard(padding = Space.s2) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(label, Modifier.weight(1f).padding(start = Space.s2), style = MaterialTheme.typography.bodyLarge)
            TextButton(onClick = { if (value > 0) onChange(value - 1) }) { Text("−", style = MaterialTheme.typography.titleLarge, color = PadelTheme.colors.foreground) }
            Text("$value", style = MaterialTheme.typography.titleLarge.merge(TabularNums))
            TextButton(onClick = { if (value < 99) onChange(value + 1) }) { Text("+", style = MaterialTheme.typography.titleLarge, color = PadelTheme.colors.foreground) }
        }
    }
}

/** Share sheet (web `ShareDialog`): the QR encodes the same https link the web shows. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShareSheet(game: LocalGame, baseUrl: String, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val url = GameLinks.spectatorUrl(baseUrl, game.code)
    val qr = remember(url) { qrBitmap(url, 720) }

    fun share(text: String) = context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text).putExtra(Intent.EXTRA_SUBJECT, game.game.name), "Share game"))

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = PadelTheme.colors.background) {
        Column(Modifier.fillMaxWidth().padding(horizontal = Space.s4).navigationBarsPadding().padding(bottom = Space.s4), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(Space.s4)) {
            Text("Share game", style = MaterialTheme.typography.titleLarge)
            if (game.needsCreate) {
                Text("This game is on this phone only. It gets a shareable code as soon as you're online.", style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground, textAlign = TextAlign.Center)
                return@Column
            }
            Text("Anyone with the link can follow the scores live, in the app or on the web.", style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground, textAlign = TextAlign.Center)
            Image(
                qr.asImageBitmap(), contentDescription = "QR code for $url", filterQuality = FilterQuality.None,
                modifier = Modifier.size(220.dp).background(Color.White, RoundedCornerShape(Radius.lg)).padding(Space.s3),
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Game code", style = MaterialTheme.typography.bodySmall, color = PadelTheme.colors.mutedForeground)
                Text(game.code, fontFamily = GeistMono, fontWeight = FontWeight.SemiBold, fontSize = 30.sp, letterSpacing = 6.sp, modifier = Modifier.testTag("share-code"))
            }
            PrimaryButton("Share link", { share(url) })
            SecondaryButton("Copy link", { clipboard.setText(AnnotatedString(url)) })
            game.organizerKey?.let { key ->
                PadelCard {
                    Column(verticalArrangement = Arrangement.spacedBy(Space.s2)) {
                        Text("Co-organizer link", style = MaterialTheme.typography.titleMedium)
                        Text("Lets another phone or the web enter scores. Share it only with people you trust.", style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground)
                        SecondaryButton("Share organizer link", { share(GameLinks.organizerUrl(baseUrl, game.code, key)) }, icon = PadelIcon.Group)
                    }
                }
            }
        }
    }
}

/** Black-on-white QR (scanners need the contrast even in dark mode). */
fun qrBitmap(text: String, size: Int): Bitmap {
    val matrix = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, size, size, mapOf(EncodeHintType.MARGIN to 0, EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M))
    val pixels = IntArray(size * size) { if (matrix[it % size, it / size]) 0xFF000000.toInt() else 0xFFFFFFFF.toInt() }
    return Bitmap.createBitmap(pixels, size, size, Bitmap.Config.ARGB_8888)
}
