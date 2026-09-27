package app.americanoo.android.ui.account

import android.app.Activity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.americanoo.android.AccountManager
import app.americanoo.android.AppViewModel
import app.americanoo.android.ui.components.PadelCard
import app.americanoo.android.ui.components.PrimaryButton
import app.americanoo.android.ui.components.SecondaryButton
import app.americanoo.android.ui.theme.PadelTheme
import app.americanoo.android.ui.theme.Space
import app.americanoo.android.ui.theme.StateColors
import kotlinx.coroutines.launch

/** Account: optional Google / Apple sign-in, sign out and in-app account deletion. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountScreen(model: AppViewModel, onBack: () -> Unit) {
    val account = model.account
    val profile by account.profile.collectAsStateWithLifecycle()
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var confirmDelete by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val activity = LocalContext.current as Activity

    fun run(action: suspend () -> String?) {
        busy = true
        error = null
        scope.launch {
            error = action()
            busy = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Account", style = MaterialTheme.typography.titleLarge) },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back", color = PadelTheme.colors.foreground) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
    ) { padding ->
        Column(
            Modifier.padding(padding).verticalScroll(rememberScrollState()).padding(Space.s4),
            verticalArrangement = Arrangement.spacedBy(Space.s4),
        ) {
            val p = profile
            if (p != null && !p.isAnonymous) {
                SignedIn(p)
                SecondaryButton("Get games from my account", { run { account.syncAccount(); null } }, enabled = !busy)
                SecondaryButton("Sign out", { account.signOut() }, Modifier.testTag("sign-out"), enabled = !busy)
                TextButton(onClick = { confirmDelete = true }, enabled = !busy, modifier = Modifier.fillMaxWidth().testTag("delete-account")) {
                    Text("Delete account", color = StateColors.error)
                }
            } else {
                Text("Keep your games everywhere", style = MaterialTheme.typography.headlineSmall)
                Text(
                    "Signing in is optional. With an account, your games show up on your other devices, on padel-americanoo.com and in your AI assistant.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = PadelTheme.colors.mutedForeground,
                )
                if (account.available) {
                    PrimaryButton("Continue with Google", { run { account.signInWithGoogle(activity) } }, Modifier.testTag("sign-in-google"), enabled = !busy)
                    SecondaryButton("Continue with Apple", { run { account.signInWithApple(activity) } }, Modifier.testTag("sign-in-apple"), enabled = !busy)
                } else {
                    Text("Sign-in isn't available in this build.", style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground)
                }
            }
            error?.let { Text(it, color = StateColors.error, style = MaterialTheme.typography.bodyMedium) }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete your account?") },
            text = { Text("Your sign-in, name, email address and the games list of your account are deleted. Games stay on this phone. This can't be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    run { account.deleteAccount(activity) { model.message.value = "Your account was deleted" } }
                }) { Text("Delete", color = StateColors.error) }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun SignedIn(p: AccountManager.Profile) {
    PadelCard {
        Column(verticalArrangement = Arrangement.spacedBy(Space.s1)) {
            Text(p.name ?: "Signed in", style = MaterialTheme.typography.titleMedium)
            p.email?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = PadelTheme.colors.mutedForeground) }
            Text(
                if (p.provider == "apple.com") "Signed in with Apple" else "Signed in with Google",
                style = MaterialTheme.typography.bodyMedium,
                color = PadelTheme.colors.mutedForeground,
            )
        }
    }
}
