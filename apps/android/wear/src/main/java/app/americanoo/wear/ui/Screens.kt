package app.americanoo.wear.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.wear.compose.foundation.lazy.TransformingLazyColumn
import androidx.wear.compose.foundation.lazy.itemsIndexed
import androidx.wear.compose.foundation.lazy.rememberTransformingLazyColumnState
import androidx.wear.compose.material3.AlertDialog
import androidx.wear.compose.material3.AlertDialogDefaults
import androidx.wear.compose.material3.Button
import androidx.wear.compose.material3.ButtonDefaults
import androidx.wear.compose.material3.EdgeButton
import androidx.wear.compose.material3.ListHeader
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.ScreenScaffold
import androidx.wear.compose.material3.Text
import androidx.wear.compose.material3.TitleCard
import app.americanoo.data.GameStatus
import app.americanoo.data.LocalGame
import app.americanoo.data.RecentGroup
import app.americanoo.engine.AdvanceStatus
import app.americanoo.engine.GameState
import app.americanoo.engine.Match
import app.americanoo.engine.advanceStatus
import app.americanoo.engine.isScored
import app.americanoo.engine.teamName

private fun GameState.team(ids: List<String>) = teamName(players, ids)
private fun Match.scoreText() = if (isScored(this)) "$scoreA–$scoreB" else "–"

@Composable
fun HomeScreen(live: List<LocalGame>, groups: List<RecentGroup>, onGame: (String) -> Unit, onGroup: (Int) -> Unit) {
    val list = rememberTransformingLazyColumnState()
    ScreenScaffold(scrollState = list) { padding ->
        TransformingLazyColumn(state = list, contentPadding = padding) {
            item { ListHeader { Text("Americanoo") } }
            itemsIndexed(live) { _, g ->
                val state = g.game.state
                Button(
                    onClick = { onGame(g.code) },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(g.game.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    secondaryLabel = { Text("Round ${state.current + 1} · ${if (g.canEdit) "Live" else "Watching"}") },
                )
            }
            if (groups.isNotEmpty()) {
                item { ListHeader { Text("Start again") } }
                itemsIndexed(groups) { i, group ->
                    Button(
                        onClick = { onGroup(i) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.filledTonalButtonColors(),
                        label = { Text(group.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                        secondaryLabel = { Text("${group.names.size} players · ${group.modeName}") },
                    )
                }
            }
            if (live.isEmpty() && groups.isEmpty()) item {
                Text(
                    "Create a game on your phone or at padel-americanoo.com to score it here.",
                    Modifier.padding(horizontal = 8.dp),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

/** A recent group's players and format, and the button that starts a new game with them. */
@Composable
fun StartAgainScreen(group: RecentGroup?, onStart: () -> Unit) {
    if (group == null) return
    val list = rememberTransformingLazyColumnState()
    ScreenScaffold(scrollState = list, edgeButton = { EdgeButton(onClick = onStart) { Text("Start") } }) { padding ->
        TransformingLazyColumn(state = list, contentPadding = padding) {
            item { ListHeader { Text(group.name, maxLines = 2, textAlign = TextAlign.Center) } }
            item {
                val courts = group.settings.courts
                Text(
                    "${group.modeName} · $courts court${if (courts == 1) "" else "s"}",
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                Text(
                    group.names.joinToString(", "),
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                )
            }
        }
    }
}

/** The current round: one card per court; the bottom button starts the next round or finishes the game. */
@Composable
fun GameScreen(game: LocalGame?, onMatch: (round: Int, match: Int) -> Unit, onNext: () -> Unit, onFinish: () -> Unit) {
    if (game == null) return
    val state = game.game.state
    val round = state.rounds.getOrNull(state.current) ?: return
    val list = rememberTransformingLazyColumnState()
    val status = advanceStatus(state)
    val live = game.game.status == GameStatus.Live && game.canEdit
    var confirmFinish by remember { mutableStateOf(false) }
    val left = round.matches.count { !isScored(it) }

    ScreenScaffold(
        scrollState = list,
        edgeButton = {
            if (live) EdgeButton(
                onClick = { if (status == AdvanceStatus.Finished) confirmFinish = true else onNext() },
                enabled = status != AdvanceStatus.Incomplete,
            ) {
                Text(
                    when (status) {
                        AdvanceStatus.Ready -> "Next round"
                        AdvanceStatus.Finished -> "Finish"
                        AdvanceStatus.Incomplete -> "$left to score"
                    },
                )
            }
        },
    ) { padding ->
        TransformingLazyColumn(state = list, contentPadding = padding) {
            item {
                ListHeader {
                    Text("Round ${state.current + 1}" + (state.plannedRounds?.let { " of $it" } ?: ""))
                }
            }
            itemsIndexed(round.matches) { i, m ->
                TitleCard(
                    onClick = { onMatch(state.current, i) },
                    enabled = live,
                    title = { Text("Court ${m.court}") },
                    time = { Text(m.scoreText()) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(state.team(m.teamA), maxLines = 2, overflow = TextOverflow.Ellipsis)
                    Text(state.team(m.teamB), maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
            }
            if (round.byes.isNotEmpty()) item {
                Text(
                    "Sitting out: " + round.byes.joinToString(", ") { id -> state.players.firstOrNull { it.id == id }?.name ?: "?" },
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            if (!game.canEdit) item {
                Text("Watching: open the organizer link on your phone to score.", style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
            } else if (game.game.status == GameStatus.Done) item {
                Text("Game finished", style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
            }
        }
    }

    AlertDialog(
        visible = confirmFinish,
        onDismissRequest = { confirmFinish = false },
        title = { Text("Finish the game?") },
        confirmButton = { AlertDialogDefaults.ConfirmButton(onClick = { confirmFinish = false; onFinish() }) },
        dismissButton = { AlertDialogDefaults.DismissButton(onClick = { confirmFinish = false }) },
    )
}

/**
 * Score for one match. Total points: turn the crown to team A's points and team B gets the rest.
 * First to N: pick the winner, then the loser's points. No scoring: pick the result.
 */
@Composable
fun ScoreScreen(state: GameState?, round: Int, match: Int, onSave: (Int?, Int?) -> Unit) {
    val m = state?.rounds?.getOrNull(round)?.matches?.getOrNull(match) ?: return
    val scoring = state.settings.scoring
    val total = scoring.points ?: 24
    val teamA = state.team(m.teamA)
    val teamB = state.team(m.teamB)
    when (scoring.type) {
        app.americanoo.engine.ScoringType.Total ->
            PointsPicker(teamA, max = total, initial = m.scoreA ?: total / 2, other = { "$teamB · ${total - it}" }) { onSave(it, total - it) }
        app.americanoo.engine.ScoringType.FirstTo -> {
            var winnerA by remember { mutableStateOf<Boolean?>(null) }
            when (val w = winnerA) {
                null -> Choices("Who reached $total?", listOf(teamA to { winnerA = true }, teamB to { winnerA = false }))
                else -> PointsPicker(if (w) teamB else teamA, max = total - 1, initial = 0, other = { "Loser's points" }) {
                    if (w) onSave(total, it) else onSave(it, total)
                }
            }
        }
        app.americanoo.engine.ScoringType.Off ->
            Choices("Result", listOf("$teamA won" to { onSave(1, 0) }, "Draw" to { onSave(0, 0) }, "$teamB won" to { onSave(0, 1) }))
        app.americanoo.engine.ScoringType.Timed -> {
            var a by remember { mutableStateOf<Int?>(null) }
            when (val first = a) {
                null -> PointsPicker(teamA, max = 99, initial = m.scoreA ?: 0, other = { "Next: $teamB" }) { a = it }
                else -> PointsPicker(teamB, max = 99, initial = m.scoreB ?: 0, other = { "$teamA · $first" }) { onSave(first, it) }
            }
        }
    }
}

@Composable
private fun Choices(title: String, options: List<Pair<String, () -> Unit>>) {
    val list = rememberTransformingLazyColumnState()
    ScreenScaffold(scrollState = list) { padding ->
        TransformingLazyColumn(state = list, contentPadding = padding) {
            item { ListHeader { Text(title) } }
            itemsIndexed(options) { _, (label, onClick) ->
                Button(onClick = onClick, modifier = Modifier.fillMaxWidth(), label = { Text(label, maxLines = 2, overflow = TextOverflow.Ellipsis) })
            }
        }
    }
}

@Composable
private fun PointsPicker(label: String, max: Int, initial: Int, other: (Int) -> String, onDone: (Int) -> Unit) {
    val picker = androidx.wear.compose.material3.rememberPickerState(
        initialNumberOfOptions = max + 1,
        initiallySelectedIndex = initial.coerceIn(0, max),
        shouldRepeatOptions = false,
    )
    ScreenScaffold { _ ->
        Column(
            Modifier.fillMaxSize().padding(top = 24.dp, bottom = 8.dp, start = 24.dp, end = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(label, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.labelMedium)
            androidx.wear.compose.material3.Picker(
                state = picker,
                contentDescription = { "$label: ${picker.selectedOptionIndex}" },
                modifier = Modifier.fillMaxWidth(0.6f).weight(1f),
            ) { i -> Text("$i", style = MaterialTheme.typography.displayMedium) }
            Text(other(picker.selectedOptionIndex), maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.labelMedium)
            Button(
                onClick = { onDone(picker.selectedOptionIndex) },
                modifier = Modifier.padding(top = 4.dp),
                label = { Text("Save", textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) },
            )
        }
    }
}

