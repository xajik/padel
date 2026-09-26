package app.americanoo.android.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.americanoo.android.AppViewModel
import app.americanoo.android.ui.components.PadelCard
import app.americanoo.android.ui.components.PadelIconView
import app.americanoo.android.ui.components.PrimaryButton
import app.americanoo.android.ui.components.SecondaryButton
import app.americanoo.android.ui.components.SectionTitle
import app.americanoo.android.ui.components.StatusLine
import app.americanoo.android.ui.components.icon
import app.americanoo.android.ui.components.modeName
import app.americanoo.android.ui.components.roundLabel
import app.americanoo.android.ui.theme.GeistMono
import app.americanoo.android.ui.theme.PadelIcon
import app.americanoo.android.ui.theme.PadelTheme
import app.americanoo.android.ui.theme.Space
import app.americanoo.android.ui.theme.TabularNums
import app.americanoo.data.GameStatus
import app.americanoo.data.LocalGame
import app.americanoo.engine.MODES
import app.americanoo.engine.ModeInfo
import app.americanoo.engine.defaultSettings
import app.americanoo.engine.estimate
import app.americanoo.engine.formatDuration

/** Mirrors the web home (`/`): brand, primary actions, your games and the formats list. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(model: AppViewModel, snackbar: SnackbarHostState, onNew: () -> Unit, onJoin: () -> Unit, onOpen: (String) -> Unit) {
    val games by model.games.collectAsStateWithLifecycle()
    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        PadelIconView(PadelIcon.Logo, 22.dp)
                        Spacer(Modifier.width(Space.s2))
                        Text("Padel", style = MaterialTheme.typography.titleLarge)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
    ) { padding ->
        LazyColumn(
            contentPadding = PaddingValues(start = Space.s4, end = Space.s4, top = padding.calculateTopPadding() + Space.s4, bottom = padding.calculateBottomPadding() + Space.s6),
            verticalArrangement = Arrangement.spacedBy(Space.s3),
        ) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(Space.s2), modifier = Modifier.padding(bottom = Space.s3)) {
                    Text("Run your padel session", style = MaterialTheme.typography.headlineLarge)
                    Text("Fair rotations, scores on court and a live leaderboard. No account needed.", style = MaterialTheme.typography.bodyLarge, color = PadelTheme.colors.mutedForeground)
                }
            }
            item { PrimaryButton("New game", onNew, Modifier.testTag("new-game")) }
            item { SecondaryButton("Join with a code", onJoin, Modifier.testTag("join-game"), icon = PadelIcon.Scoreboard) }
            if (games.isNotEmpty()) {
                item { Spacer(Modifier.padding(top = Space.s2)); SectionTitle("Your games") }
                items(games, key = { it.game.id }) { GameRow(it) { onOpen(it.code) } }
            }
            item { Spacer(Modifier.padding(top = Space.s2)); SectionTitle("Formats") }
            items(MODES, key = { it.id.name }) { ModeCard(it) }
        }
    }
}

@Composable
private fun GameRow(g: LocalGame, onClick: () -> Unit) {
    val state = g.game.state
    PadelCard(onClick = onClick, modifier = Modifier.testTag("game-${g.game.name}")) {
        Row(horizontalArrangement = Arrangement.spacedBy(Space.s3), verticalAlignment = Alignment.CenterVertically) {
            PadelIconView(state.settings.mode.icon())
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Space.s1)) {
                Text(g.game.name, style = MaterialTheme.typography.titleMedium)
                Text(
                    "${state.modeName} · ${state.players.size} players · ${if (g.game.status == GameStatus.Done) "Finished" else state.roundLabel}",
                    style = MaterialTheme.typography.bodyMedium.merge(TabularNums),
                    color = PadelTheme.colors.mutedForeground,
                )
                StatusLine(g)
            }
            Text(g.code, fontFamily = GeistMono, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground)
        }
    }
}

@Composable
private fun ModeCard(mode: ModeInfo) {
    val estimate = estimate(defaultSettings(mode.id, 8), 8)
    PadelCard {
        Row(horizontalArrangement = Arrangement.spacedBy(Space.s3)) {
            PadelIconView(mode.id.icon())
            Column(verticalArrangement = Arrangement.spacedBy(Space.s1)) {
                Text(mode.name, style = MaterialTheme.typography.titleMedium)
                Text(mode.summary, style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground)
                Text("8 players · ${estimate.rounds} rounds · ~${formatDuration(estimate.minutes)}", style = MaterialTheme.typography.bodySmall.merge(TabularNums), color = PadelTheme.colors.mutedForeground)
            }
        }
    }
}
