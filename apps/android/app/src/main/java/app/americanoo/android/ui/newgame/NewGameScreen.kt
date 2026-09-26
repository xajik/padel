package app.americanoo.android.ui.newgame

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import app.americanoo.android.AppViewModel
import app.americanoo.android.ui.components.Choice
import app.americanoo.android.ui.components.PadelCard
import app.americanoo.android.ui.components.PrimaryButton
import app.americanoo.android.ui.components.SecondaryButton
import app.americanoo.android.ui.components.SectionTitle
import app.americanoo.android.ui.theme.PadelIcon
import app.americanoo.android.ui.theme.PadelTheme
import app.americanoo.android.ui.theme.Space
import app.americanoo.android.ui.theme.StateColors
import app.americanoo.android.ui.theme.TabularNums
import app.americanoo.data.GameSetup
import app.americanoo.engine.MAX_PLAYERS
import app.americanoo.engine.MIN_PLAYERS
import app.americanoo.engine.MODES
import app.americanoo.engine.ModeId
import app.americanoo.engine.ScoringType
import app.americanoo.engine.Side
import app.americanoo.engine.formatDuration
import app.americanoo.engine.maxCourts
import app.americanoo.engine.modeInfo
import kotlinx.coroutines.launch

private enum class RoundsChoice(val label: String) { Auto("Auto"), Fixed("Fixed"), Open("Open") }

/** New game, mirroring the web setup wizard (`/new`) on one scrolling form. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewGameScreen(model: AppViewModel, onBack: () -> Unit) {
    var mode by remember { mutableStateOf(ModeId.Americano) }
    var name by remember { mutableStateOf("") }
    val names = remember { mutableStateListOf(*Array(8) { "" }) }
    val sides = remember { mutableStateListOf(*Array(8) { if (it % 2 == 0) Side.A else Side.B }) }
    var courts by remember { mutableIntStateOf(2) }
    var scoring by remember { mutableStateOf(ScoringType.Total) }
    var points by remember { mutableIntStateOf(24) }
    var rounds by remember { mutableStateOf(RoundsChoice.Auto) }
    var fixedRounds by remember { mutableIntStateOf(7) }
    var byeAverage by remember { mutableStateOf(false) }
    var creating by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val info = modeInfo(mode)
    val roster = names.mapIndexed { i, n -> n.trim().ifEmpty { "Player ${i + 1}" } }
    val maxC = maxCourts(names.size)
    val settings = GameSetup.settings(
        mode, names.size, courts.coerceAtMost(maxC), scoring, points,
        when (rounds) { RoundsChoice.Auto -> null; RoundsChoice.Open -> 0; RoundsChoice.Fixed -> fixedRounds },
        byeAverage,
    )
    val problem = GameSetup.problem(settings, roster, if (info.sides) sides.toList() else null)
    val estimate = GameSetup.estimateFor(settings, names.size)

    fun add(count: Int) = repeat(count) {
        names.add("")
        sides.add(if (names.size % 2 == 1) Side.A else Side.B)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New game", style = MaterialTheme.typography.titleLarge) },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back", color = PadelTheme.colors.foreground) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
        bottomBar = {
            Surface(color = PadelTheme.colors.background, tonalElevation = 0.dp) {
                Column(Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(horizontal = Space.s4, vertical = Space.s3), verticalArrangement = Arrangement.spacedBy(Space.s2)) {
                    when {
                        problem != null -> Text(problem.message, color = StateColors.error, style = MaterialTheme.typography.bodyMedium)
                        estimate != null -> Text(
                            if (estimate.openEnded) "Open-ended · ${estimate.matches / maxOf(estimate.rounds, 1)} matches per round"
                            else "${estimate.rounds} rounds · ${estimate.matches} matches · ~${formatDuration(estimate.minutes)}",
                            style = MaterialTheme.typography.bodyMedium.merge(TabularNums),
                            color = PadelTheme.colors.mutedForeground,
                        )
                    }
                    error?.let { Text(it, color = StateColors.error, style = MaterialTheme.typography.bodyMedium) }
                    PrimaryButton(if (creating) "Starting…" else "Start game", {
                        creating = true
                        scope.launch {
                            error = model.create(name, settings, roster, if (info.sides) sides.toList() else null)
                            creating = false
                        }
                    }, Modifier.testTag("start-game"), enabled = problem == null && !creating)
                }
            }
        },
    ) { padding ->
        LazyColumn(
            contentPadding = PaddingValues(start = Space.s4, end = Space.s4, top = padding.calculateTopPadding() + Space.s2, bottom = padding.calculateBottomPadding() + Space.s4),
            verticalArrangement = Arrangement.spacedBy(Space.s3),
        ) {
            item { SectionTitle("Format") }
            items(MODES.chunked(2).size) { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                    MODES.chunked(2)[row].forEach { m ->
                        Choice(m.name, m.id == mode) {
                            mode = m.id
                            // Beat the Box / Up & Down need exactly 4 per court.
                            if (m.fullCourts) {
                                val target = maxOf(4, names.size / 4 * 4)
                                while (names.size > target) { names.removeAt(names.lastIndex); sides.removeAt(sides.lastIndex) }
                            }
                        }
                    }
                }
            }
            item { Text(info.summary, style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground) }
            item {
                OutlinedTextField(name, { name = it }, Modifier.fillMaxWidth(), label = { Text("Game name (optional)") }, placeholder = { Text(info.name) }, singleLine = true)
            }

            item { SectionTitle("Players", names.size.toString()) }
            itemsIndexed(names) { i, value ->
                Column {
                    if (info.teams && i % 2 == 0) Text("Team ${i / 2 + 1}", style = MaterialTheme.typography.labelMedium, color = PadelTheme.colors.mutedForeground)
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                        OutlinedTextField(
                            value, { names[i] = it }, Modifier.weight(1f),
                            placeholder = { Text("Player ${i + 1}") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words, imeAction = if (i == names.lastIndex) ImeAction.Done else ImeAction.Next),
                        )
                        if (info.sides) {
                            Row(Modifier.width(96.dp), horizontalArrangement = Arrangement.spacedBy(Space.s1)) {
                                Choice("A", sides[i] == Side.A) { sides[i] = Side.A }
                                Choice("B", sides[i] == Side.B) { sides[i] = Side.B }
                            }
                        }
                        if (names.size > MIN_PLAYERS) {
                            TextButton(onClick = { names.removeAt(i); sides.removeAt(i) }) { Text("✕", color = PadelTheme.colors.mutedForeground) }
                        }
                    }
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                    SecondaryButton("Add player", { add(1) }, Modifier.weight(1f), enabled = names.size < MAX_PLAYERS)
                    if (info.teams) SecondaryButton("Add team", { add(2) }, Modifier.weight(1f), icon = PadelIcon.Pair, enabled = names.size + 2 <= MAX_PLAYERS)
                }
            }

            if (!info.fullCourts) {
                item { SectionTitle("Courts") }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                        (1..maxOf(1, maxC)).forEach { c -> Choice("$c", c == courts.coerceAtMost(maxC)) { courts = c } }
                    }
                }
            }

            item { SectionTitle("Scoring") }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                    Choice("Total", scoring == ScoringType.Total) { scoring = ScoringType.Total }
                    Choice("First to", scoring == ScoringType.FirstTo) { scoring = ScoringType.FirstTo }
                    Choice("Timed", scoring == ScoringType.Timed) { scoring = ScoringType.Timed }
                    Choice("Win/loss", scoring == ScoringType.Off) { scoring = ScoringType.Off }
                }
            }
            if (scoring == ScoringType.Total || scoring == ScoringType.FirstTo) {
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                        GameSetup.POINT_OPTIONS.forEach { p -> Choice("$p", p == points) { points = p } }
                    }
                }
                item {
                    Text(
                        if (scoring == ScoringType.Total) "Both scores add up to $points, e.g. ${points / 2 + 3}–${points / 2 - 3}." else "First team to $points wins the match.",
                        style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground,
                    )
                }
            }

            item { SectionTitle("Rounds") }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                    RoundsChoice.entries.forEach { c -> Choice(c.label, c == rounds) { rounds = c } }
                }
            }
            if (rounds == RoundsChoice.Fixed) {
                item {
                    PadelCard(padding = Space.s2) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            TextButton(onClick = { if (fixedRounds > 1) fixedRounds-- }) { Text("−", style = MaterialTheme.typography.titleLarge, color = PadelTheme.colors.foreground) }
                            Text("$fixedRounds rounds", Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge.merge(TabularNums))
                            TextButton(onClick = { if (fixedRounds < 30) fixedRounds++ }) { Text("+", style = MaterialTheme.typography.titleLarge, color = PadelTheme.colors.foreground) }
                        }
                    }
                }
            }
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Credit sit-outs", style = MaterialTheme.typography.bodyLarge)
                        Text("Players sitting out get their average points.", style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground)
                    }
                    Switch(byeAverage, { byeAverage = it }, colors = SwitchDefaults.colors(checkedTrackColor = PadelTheme.colors.primary))
                }
            }
        }
    }
}
