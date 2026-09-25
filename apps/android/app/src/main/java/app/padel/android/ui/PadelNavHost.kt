package app.padel.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.SnackbarHostState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.padel.android.ui.theme.PadelTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import app.padel.android.AppViewModel
import app.padel.android.ui.game.GameScreen
import app.padel.android.ui.home.HomeScreen
import app.padel.android.ui.join.JoinScreen
import app.padel.android.ui.newgame.NewGameScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Routes mirror the web: `/`, `/new`, `/join`, `/g/{code}`. */
@Composable
fun PadelNavHost(model: AppViewModel) {
    val nav = rememberNavController()
    val snackbar = remember { SnackbarHostState() }
    val message by model.message.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        model.navigate.collect { code ->
            // Navigation must run on the main thread (the emitter may resume elsewhere).
            withContext(Dispatchers.Main.immediate) {
                nav.navigate("game/$code") {
                    popUpTo("home")
                    launchSingleTop = true
                }
            }
        }
    }
    LaunchedEffect(message) {
        message?.let {
            snackbar.showSnackbar(it)
            model.message.value = null
        }
    }

    // Tablets: a readable centred column, like the web's max-w container.
    Box(Modifier.fillMaxSize().background(PadelTheme.colors.background), contentAlignment = Alignment.TopCenter) {
    Box(Modifier.widthIn(max = 720.dp)) {
    NavHost(nav, startDestination = "home") {
        composable("home") {
            HomeScreen(model, snackbar, onNew = { nav.navigate("new") }, onJoin = { nav.navigate("join") }, onOpen = { nav.navigate("game/$it") })
        }
        composable("new") { NewGameScreen(model, onBack = { nav.popBackStack() }) }
        composable("join") { JoinScreen(model, onBack = { nav.popBackStack() }) }
        composable("game/{code}") { entry ->
            GameScreen(model, entry.arguments?.getString("code").orEmpty(), snackbar, onBack = { nav.popBackStack() })
        }
    }
}
    }
}
