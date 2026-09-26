package app.americanoo.wear.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.platform.LocalContext
import android.widget.Toast
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material3.AppScaffold
import androidx.wear.compose.material3.ColorScheme
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import app.americanoo.data.GameRepository
import app.americanoo.data.GameStatus
import app.americanoo.data.recentGroups
import app.americanoo.engine.EngineError
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * Home (live games and "Start again") → game (the current round, next round at the bottom) → score.
 * A running game opens straight away.
 */
@Composable
fun WearApp(repo: GameRepository, onOpen: (String?) -> Unit) {
    val nav = rememberSwipeDismissableNavController()
    val games by repo.games.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var autoOpened by rememberSaveable { mutableStateOf(false) }

    /** Runs an edit; engine errors (not an organizer, round incomplete) show as a toast. */
    fun act(block: suspend CoroutineScope.() -> Unit) = scope.launch {
        try {
            block()
        } catch (e: EngineError) {
            Toast.makeText(context, e.message, Toast.LENGTH_LONG).show()
        }
    }

    LaunchedEffect(Unit) {
        val live = repo.games.value.filter { it.game.status == GameStatus.Live }
        if (!autoOpened && live.size == 1) nav.navigate("game/${live.single().code}")
        autoOpened = true
    }

    MaterialTheme(colorScheme = Monochrome) {
        AppScaffold {
            SwipeDismissableNavHost(navController = nav, startDestination = "home") {
                composable("home") {
                    LaunchedEffect(Unit) { onOpen(null) }
                    HomeScreen(
                        live = games.filter { it.game.status == GameStatus.Live },
                        groups = recentGroups(games),
                        onGame = { nav.navigate("game/$it") },
                        onGroup = { nav.navigate("again/$it") },
                    )
                }
                composable("again/{index}") { entry ->
                    val group = recentGroups(games).getOrNull(entry.arguments?.getString("index")?.toIntOrNull() ?: -1)
                    StartAgainScreen(group) {
                        act {
                            val g = repo.rematch(group!!)
                            nav.popBackStack("home", inclusive = false)
                            nav.navigate("game/${g.code}")
                        }
                    }
                }
                composable("game/{code}") { entry ->
                    val code = repo.resolve(entry.arguments?.getString("code").orEmpty())
                    LaunchedEffect(code) { onOpen(code) }
                    GameScreen(
                        game = games.firstOrNull { it.code == code },
                        onMatch = { round, match -> nav.navigate("score/$code/$round/$match") },
                        onNext = { act { repo.next(code) } },
                        onFinish = { act { repo.finish(code) } },
                    )
                }
                composable("score/{code}/{round}/{match}") { entry ->
                    val args = entry.arguments
                    val code = repo.resolve(args?.getString("code").orEmpty())
                    val round = args?.getString("round")?.toIntOrNull() ?: 0
                    val match = args?.getString("match")?.toIntOrNull() ?: 0
                    val state = games.firstOrNull { it.code == code }?.game?.state
                    ScoreScreen(state, round, match) { a, b ->
                        act {
                            repo.score(code, round, match, a, b)
                            nav.popBackStack()
                        }
                    }
                }
            }
        }
    }
}

/** Black & white like the phone app: white primary actions, dark grey cards. */
private val Monochrome = ColorScheme(
    primary = Color(0xFFFAFAFA),
    onPrimary = Color(0xFF0A0A0A),
    primaryContainer = Color(0xFFFAFAFA),
    onPrimaryContainer = Color(0xFF0A0A0A),
    primaryDim = Color(0xFFD4D4D4),
    secondary = Color(0xFFD4D4D4),
    onSecondary = Color(0xFF0A0A0A),
    secondaryContainer = Color(0xFF262626),
    onSecondaryContainer = Color(0xFFFAFAFA),
    tertiary = Color(0xFFD4D4D4),
    onTertiary = Color(0xFF0A0A0A),
    surfaceContainerLow = Color(0xFF141414),
    surfaceContainer = Color(0xFF1F1F1F),
    surfaceContainerHigh = Color(0xFF262626),
    onSurface = Color(0xFFFAFAFA),
    onSurfaceVariant = Color(0xFFA3A3A3),
    outline = Color(0xFF525252),
    outlineVariant = Color(0xFF262626),
    background = Color(0xFF000000),
    onBackground = Color(0xFFFAFAFA),
)
