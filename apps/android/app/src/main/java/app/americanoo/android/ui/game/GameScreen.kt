package app.americanoo.android.ui.game

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SecondaryTabRow
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.americanoo.android.AppViewModel
import app.americanoo.android.live.GameNotifications
import app.americanoo.android.ui.components.PadelCard
import app.americanoo.android.ui.components.PadelIconView
import app.americanoo.android.ui.components.PrimaryButton
import app.americanoo.android.ui.components.SectionTitle
import app.americanoo.android.ui.components.StatusLine
import app.americanoo.android.ui.components.formatScore
import app.americanoo.android.ui.components.modeName
import app.americanoo.android.ui.components.name
import app.americanoo.android.ui.components.team
import app.americanoo.android.ui.theme.FontSize
import app.americanoo.android.ui.theme.GeistMono
import app.americanoo.android.ui.theme.PadelIcon
import app.americanoo.android.ui.theme.PadelTheme
import app.americanoo.android.ui.theme.Radius
import app.americanoo.android.ui.theme.Space
import app.americanoo.android.ui.theme.StateColors
import app.americanoo.android.ui.theme.TabularNums
import app.americanoo.android.ui.theme.Tokens
import app.americanoo.data.GameStatus
import app.americanoo.data.LocalGame
import app.americanoo.engine.AdvanceStatus
import app.americanoo.engine.GameState
import app.americanoo.engine.LeaderboardMode
import app.americanoo.engine.Match
import app.americanoo.engine.ScoringType
import app.americanoo.engine.advanceStatus
import app.americanoo.engine.computeStandings
import app.americanoo.engine.isScored

private enum class GameTab(val label: String) { Round("Round"), Leaderboard("Leaderboard"), Rounds("Rounds") }

/** The live game (`/g/{code}` on the web): current round, scoring, leaderboard and rounds. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GameScreen(model: AppViewModel, code: String, snackbar: SnackbarHostState, onBack: () -> Unit) {
    val games by model.games.collectAsStateWithLifecycle()
    val current = model.resolve(code)
    val game = games.firstOrNull { it.code == current }
    var tab by remember { mutableStateOf(GameTab.Round) }
    var viewed by remember { mutableStateOf<Int?>(null) }
    var scoring by remember { mutableStateOf<Pair<Int, Int>?>(null) }
    var sharing by remember { mutableStateOf(false) }
    var menu by remember { mutableStateOf(false) }
    var confirmFinish by remember { mutableStateOf(false) }
    val context = LocalContext.current
    var pendingFollow by remember { mutableStateOf<LocalGame?>(null) }
    val notificationPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        pendingFollow?.let { if (granted) GameNotifications.toggle(context, it) }
        pendingFollow = null
    }

    DisposableEffect(current) {
        model.openCode.value = current
        onDispose { if (model.openCode.value == current) model.openCode.value = null }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                title = {},
                navigationIcon = { TextButton(onClick = onBack) { Text("Back", color = PadelTheme.colors.foreground) } },
                actions = {
                    if (game != null) {
                        TextButton(onClick = { menu = true }, modifier = Modifier.testTag("game-menu")) { Text("•••", color = PadelTheme.colors.foreground) }
                        DropdownMenu(menu, { menu = false }) {
                            DropdownMenuItem(text = { Text("Share game") }, onClick = { menu = false; sharing = true })
                            if (game.game.status == GameStatus.Live) {
                                val following = GameNotifications.isFollowing(context, game.code)
                                DropdownMenuItem(
                                    text = { Text(if (following) "Stop live notification" else "Follow in notifications") },
                                    onClick = {
                                        menu = false
                                        if (following || GameNotifications.canPost(context)) GameNotifications.toggle(context, game)
                                        else { pendingFollow = game; notificationPermission.launch(android.Manifest.permission.POST_NOTIFICATIONS) }
                                    },
                                    modifier = Modifier.testTag("follow-live"),
                                )
                            }
                            if (game.canEdit && game.game.status == GameStatus.Done) {
                                DropdownMenuItem(text = { Text("Reopen game") }, onClick = { menu = false; model.perform { model.repo.reopen(game.code) } })
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
        bottomBar = { if (game != null && game.canEdit && tab == GameTab.Round) ActionBar(game, onNext = { viewed = null; model.perform { model.repo.next(game.code) } }, onFinish = { confirmFinish = true }) },
    ) { padding ->
        if (game == null) {
            Box(Modifier.padding(padding).fillMaxWidth().padding(Space.s6), contentAlignment = Alignment.Center) {
                Text("This game is no longer on this phone.", color = PadelTheme.colors.mutedForeground)
            }
            return@Scaffold
        }
        val state = game.game.state
        val shown = (viewed ?: state.current).coerceAtMost(state.current)
        LazyColumn(
            contentPadding = PaddingValues(start = Space.s4, end = Space.s4, top = padding.calculateTopPadding(), bottom = padding.calculateBottomPadding() + Space.s4),
            verticalArrangement = Arrangement.spacedBy(Space.s4),
        ) {
            item { Header(game) { sharing = true } }
            if (game.game.status == GameStatus.Done) item { Podium(state) }
            item {
                SecondaryTabRow(selectedTabIndex = tab.ordinal, containerColor = PadelTheme.colors.background) {
                    GameTab.entries.forEach { t -> Tab(t == tab, { tab = t }, Modifier.testTag("tab-${t.label}"), text = { Text(t.label) }) }
                }
            }
            when (tab) {
                GameTab.Round -> {
                    item { RoundPicker(state, shown) { viewed = it } }
                    itemsIndexed(state.rounds[shown].matches) { i, m ->
                        CourtCard(state, m, editable = game.canEdit && game.game.status == GameStatus.Live) { scoring = shown to i }
                    }
                    val byes = state.rounds[shown].byes
                    if (byes.isNotEmpty()) item {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                            PadelIconView(PadelIcon.Sitout, 18.dp)
                            Text("Sitting out: ${byes.joinToString { state.name(it) }}", style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground)
                        }
                    }
                    item { SectionTitle("Leaderboard") }
                    item { Leaderboard(state, limit = 4) }
                }
                GameTab.Leaderboard -> item { Leaderboard(state, limit = null) }
                GameTab.Rounds -> itemsIndexed(state.rounds.take(state.current + 1)) { i, r ->
                    PadelCard(padding = Space.s3, onClick = { viewed = i; tab = GameTab.Round }) {
                        Column(verticalArrangement = Arrangement.spacedBy(Space.s1)) {
                            Text("Round ${i + 1}", style = MaterialTheme.typography.titleMedium)
                            r.matches.forEach { m ->
                                Row {
                                    Text("${state.team(m.teamA)}  vs  ${state.team(m.teamB)}", Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text(if (isScored(m)) "${m.scoreA}–${m.scoreB}" else "–", style = MaterialTheme.typography.bodyMedium.merge(TabularNums), color = PadelTheme.colors.mutedForeground)
                                }
                            }
                        }
                    }
                }
            }
            game.lastError?.let { item { Text(it, style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground) } }
        }

        scoring?.let { (round, match) ->
            ScorePadSheet(game, round, match, onDismiss = { scoring = null }) { a, b ->
                scoring = null
                model.perform { model.repo.score(game.code, round, match, a, b) }
            }
        }
        if (sharing) ShareSheet(game, model.repo.baseUrl) { sharing = false }
        if (confirmFinish) AlertDialog(
            onDismissRequest = { confirmFinish = false },
            title = { Text("Finish the game?") },
            text = { Text("Results freeze for everyone following. You can reopen it later.") },
            confirmButton = { TextButton(onClick = { confirmFinish = false; model.perform { model.repo.finish(game.code) } }) { Text("Finish", color = PadelTheme.colors.foreground) } },
            dismissButton = { TextButton(onClick = { confirmFinish = false }) { Text("Cancel", color = PadelTheme.colors.mutedForeground) } },
        )
    }
}

@Composable
private fun Header(game: LocalGame, onShare: () -> Unit) {
    val state = game.game.state
    Row(horizontalArrangement = Arrangement.spacedBy(Space.s3)) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Space.s1)) {
            Text(game.game.name, style = MaterialTheme.typography.headlineMedium)
            Text("${state.modeName} · ${state.players.size} players · ${state.settings.courts} court${if (state.settings.courts == 1) "" else "s"}", style = MaterialTheme.typography.bodyLarge, color = PadelTheme.colors.mutedForeground)
            StatusLine(game)
        }
        Surface(
            onClick = onShare,
            shape = RoundedCornerShape(Radius.md),
            color = PadelTheme.colors.background,
            border = BorderStroke(1.dp, PadelTheme.colors.border),
            modifier = Modifier.heightIn(min = Tokens.touchTarget).testTag("share-game"),
        ) {
            Row(Modifier.padding(horizontal = Space.s3, vertical = Space.s2), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                PadelIconView(PadelIcon.Share, 18.dp)
                Text(if (game.needsCreate) "Share" else game.code, fontFamily = GeistMono, fontWeight = FontWeight.SemiBold, letterSpacing = MaterialTheme.typography.bodyLarge.fontSize * 0.12f)
            }
        }
    }
}

@Composable
private fun RoundPicker(state: GameState, shown: Int, onPick: (Int) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text("Round ${shown + 1}", style = MaterialTheme.typography.titleMedium)
        state.plannedRounds?.let { Text(" of $it", style = MaterialTheme.typography.bodyLarge, color = PadelTheme.colors.mutedForeground) }
        Box(Modifier.weight(1f))
        Row(Modifier.horizontalScroll(rememberScrollState(Int.MAX_VALUE)).width(220.dp), horizontalArrangement = Arrangement.spacedBy(Space.s2, Alignment.End)) {
            (0..state.current).forEach { i ->
                val selected = i == shown
                Surface(
                    onClick = { onPick(i) },
                    shape = RoundedCornerShape(Radius.md),
                    color = if (selected) PadelTheme.colors.primary else PadelTheme.colors.background,
                    contentColor = if (selected) PadelTheme.colors.primaryForeground else PadelTheme.colors.foreground,
                    border = BorderStroke(1.dp, PadelTheme.colors.border),
                    modifier = Modifier.size(Tokens.touchTarget),
                ) { Box(contentAlignment = Alignment.Center) { Text("${i + 1}", style = MaterialTheme.typography.bodyLarge.merge(TabularNums)) } }
            }
        }
    }
}

/** One court: both teams with their score boxes (web `CourtCard`). */
@Composable
fun CourtCard(state: GameState, match: Match, editable: Boolean, onScore: () -> Unit) {
    val scored = isScored(match)
    val off = state.settings.scoring.type == ScoringType.Off
    val modifier = Modifier.testTag("court-${match.court}").let { if (editable) it.clickable(role = Role.Button, onClickLabel = "Enter the score", onClick = onScore) else it }
    Surface(shape = RoundedCornerShape(Radius.lg), color = PadelTheme.colors.surface, border = BorderStroke(1.dp, PadelTheme.colors.border), modifier = modifier.fillMaxWidth()) {
        Column(Modifier.padding(Space.s4), verticalArrangement = Arrangement.spacedBy(Space.s2)) {
            Row {
                Text("Court ${match.court}", Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground)
                Text(if (scored) "Final" else "In play", style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground)
            }
            val a = match.scoreA ?: 0
            val b = match.scoreB ?: 0
            TeamRow(state.team(match.teamA), match.scoreA, won = scored && a > b, lost = scored && a < b, off, editable)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Space.s3)) {
                HorizontalDivider(Modifier.weight(1f), color = PadelTheme.colors.border)
                Text("vs", style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground)
                HorizontalDivider(Modifier.weight(1f), color = PadelTheme.colors.border)
            }
            TeamRow(state.team(match.teamB), match.scoreB, won = scored && b > a, lost = scored && b < a, off, editable)
        }
    }
}

@Composable
private fun TeamRow(name: String, score: Int?, won: Boolean, lost: Boolean, off: Boolean, editable: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Space.s3)) {
        Text(
            name, Modifier.weight(1f),
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = if (won) FontWeight.SemiBold else FontWeight.Normal, fontSize = FontSize.lg),
            color = if (lost) PadelTheme.colors.mutedForeground else PadelTheme.colors.foreground,
        )
        val shape = RoundedCornerShape(Radius.md)
        Box(
            Modifier.size(56.dp, 48.dp)
                .background(if (won) PadelTheme.colors.primary else PadelTheme.colors.muted, shape)
                // Only the editable view looks tappable (matches the web fix for view-only boxes).
                .let { if (editable && score == null) it.border(1.dp, PadelTheme.colors.border, shape) else it },
            contentAlignment = Alignment.Center,
        ) {
            Text(
                score?.let { if (off) (if (it == 1) "W" else "–") else "$it" } ?: "–",
                style = MaterialTheme.typography.headlineMedium.merge(TabularNums),
                color = if (won) PadelTheme.colors.primaryForeground else PadelTheme.colors.foreground,
            )
        }
    }
}

@Composable
fun Leaderboard(state: GameState, limit: Int?) {
    val all = computeStandings(state)
    val rows = limit?.let { all.take(it) } ?: all
    val label = when {
        state.settings.scoring.type == ScoringType.Off || state.settings.leaderboard == LeaderboardMode.Wins -> "Wins"
        state.settings.leaderboard == LeaderboardMode.Average -> "Avg"
        else -> "Pts"
    }
    Surface(shape = RoundedCornerShape(Radius.lg), color = PadelTheme.colors.surface, border = BorderStroke(1.dp, PadelTheme.colors.border), modifier = Modifier.fillMaxWidth()) {
        Column {
            Row(Modifier.padding(horizontal = Space.s4, vertical = Space.s3)) {
                val muted = PadelTheme.colors.mutedForeground
                Text("#", Modifier.width(28.dp), color = muted, style = MaterialTheme.typography.bodyMedium)
                Text("Player", Modifier.weight(1f), color = muted, style = MaterialTheme.typography.bodyMedium)
                if (limit == null) {
                    Text("P", Modifier.width(28.dp), color = muted, style = MaterialTheme.typography.bodyMedium)
                    Text("+/−", Modifier.width(44.dp), color = muted, style = MaterialTheme.typography.bodyMedium)
                }
                Text(label, color = muted, style = MaterialTheme.typography.bodyMedium)
            }
            rows.forEach { s ->
                HorizontalDivider(color = PadelTheme.colors.border)
                Row(Modifier.heightIn(min = Tokens.touchTarget).padding(horizontal = Space.s4), verticalAlignment = Alignment.CenterVertically) {
                    Text("${s.rank}", Modifier.width(28.dp), style = MaterialTheme.typography.bodyLarge.merge(TabularNums))
                    Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                        Text(s.name, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        // Colour only for rank movement, always with an arrow (PRD §3a).
                        if (s.movement != 0) Text(
                            "${if (s.movement > 0) "↑" else "↓"}${kotlin.math.abs(s.movement)}",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (s.movement > 0) StateColors.up else StateColors.down,
                        )
                    }
                    if (limit == null) {
                        Text("${s.played}", Modifier.width(28.dp), color = PadelTheme.colors.mutedForeground, style = MaterialTheme.typography.bodyLarge.merge(TabularNums))
                        Text(if (s.diff > 0) "+${s.diff}" else "${s.diff}", Modifier.width(44.dp), color = PadelTheme.colors.mutedForeground, style = MaterialTheme.typography.bodyLarge.merge(TabularNums))
                    }
                    Text(formatScore(s.score), style = MaterialTheme.typography.titleLarge.merge(TabularNums))
                }
            }
        }
    }
}

@Composable
private fun Podium(state: GameState) {
    val top = computeStandings(state).take(3)
    PadelCard {
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
            listOf(1, 0, 2).filter { it < top.size }.forEach { i ->
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(Space.s2)) {
                    if (i == 0) PadelIconView(PadelIcon.Podium, 28.dp)
                    Text(top[i].name, style = MaterialTheme.typography.titleSmall, maxLines = 2)
                    Box(
                        Modifier.fillMaxWidth().height(listOf(96, 72, 56)[i].dp).background(if (i == 0) PadelTheme.colors.primary else PadelTheme.colors.muted, RoundedCornerShape(Radius.md)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(formatScore(top[i].score), style = MaterialTheme.typography.headlineSmall.merge(TabularNums), color = if (i == 0) PadelTheme.colors.primaryForeground else PadelTheme.colors.foreground)
                    }
                    Text(listOf("1st", "2nd", "3rd")[i], style = MaterialTheme.typography.bodySmall, color = PadelTheme.colors.mutedForeground)
                }
            }
        }
    }
}

@Composable
private fun ActionBar(game: LocalGame, onNext: () -> Unit, onFinish: () -> Unit) {
    if (game.game.status != GameStatus.Live) return
    Surface(color = PadelTheme.colors.background) {
        Box(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = Space.s4, vertical = Space.s2)) {
            when (advanceStatus(game.game.state)) {
                AdvanceStatus.Ready -> PrimaryButton("Start round ${game.game.state.current + 2}", onNext, Modifier.testTag("next-round"))
                AdvanceStatus.Finished -> PrimaryButton("Finish game", onFinish, Modifier.testTag("finish-game"))
                AdvanceStatus.Incomplete -> {
                    val left = game.game.state.rounds[game.game.state.current].matches.count { !isScored(it) }
                    Text(
                        "Enter $left more score${if (left == 1) "" else "s"} to start the next round",
                        Modifier.fillMaxWidth().heightIn(min = Tokens.touchTarget).padding(top = Space.s3),
                        style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }
        }
    }
}
