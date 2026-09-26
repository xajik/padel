package app.americanoo.android.ui.join

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.sp
import app.americanoo.android.AppViewModel
import app.americanoo.android.ui.components.PrimaryButton
import app.americanoo.android.ui.components.SecondaryButton
import app.americanoo.android.ui.theme.GeistMono
import app.americanoo.android.ui.theme.PadelIcon
import app.americanoo.android.ui.theme.PadelTheme
import app.americanoo.android.ui.theme.Space
import app.americanoo.android.ui.theme.StateColors
import app.americanoo.data.GameLinks
import kotlinx.coroutines.launch

/** Join by code (web `/join`), pasted link, camera QR scan or a QR in a photo/screenshot. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JoinScreen(model: AppViewModel, onBack: () -> Unit) {
    var input by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var joining by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current

    fun join(text: String) {
        if (GameLinks.parse(text) == null) {
            error = "That doesn't look like a game code or link."
            return
        }
        joining = true
        scope.launch {
            error = model.join(text)
            joining = false
        }
    }

    var scanning by remember { mutableStateOf(false) }

    /** Photo or camera: QR payloads and recognised text, confirmed against the server. */
    fun joinScanned(text: String, source: String) {
        if (!ScanReader.hasGame(text)) {
            error = "No QR code or game code found in $source."
            return
        }
        GameLinks.candidates(text).firstOrNull()?.let { input = it.code }
        joining = true
        scope.launch {
            error = model.joinScanned(text)
            joining = false
        }
    }

    val photo = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch { joinScanned(ScanReader.read(context, uri), "that image") }
    }

    if (scanning) CodeScanner(onFound = { scanning = false; joinScanned(it, "the camera") }, onDismiss = { scanning = false })

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Join a game", style = MaterialTheme.typography.titleLarge) },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back", color = PadelTheme.colors.foreground) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
    ) { padding ->
        Column(Modifier.padding(padding).padding(Space.s4), verticalArrangement = Arrangement.spacedBy(Space.s4)) {
            Text("Enter the 6-character code from the organizer, or scan their QR code or game code.", style = MaterialTheme.typography.bodyLarge, color = PadelTheme.colors.mutedForeground)
            OutlinedTextField(
                input, { input = it; error = null },
                Modifier.fillMaxWidth().testTag("join-code"),
                placeholder = { Text("K7Q2MX", fontFamily = GeistMono) },
                textStyle = TextStyle(fontFamily = GeistMono, fontWeight = FontWeight.SemiBold, fontSize = 24.sp, letterSpacing = 4.sp),
                singleLine = true,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters, autoCorrectEnabled = false, imeAction = ImeAction.Go),
                keyboardActions = KeyboardActions(onGo = { join(input) }),
            )
            error?.let { Text(it, color = StateColors.error, style = MaterialTheme.typography.bodyMedium) }
            PrimaryButton(if (joining) "Joining…" else "Join game", { join(input) }, Modifier.testTag("join-submit"), enabled = GameLinks.parse(input) != null && !joining)
            Row(horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                SecondaryButton("Scan code", { scanning = true }, Modifier.weight(1f).testTag("scan-code"), icon = PadelIcon.Scoreboard)
                SecondaryButton("From photo", { photo.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, Modifier.weight(1f).testTag("from-photo"))
            }
            SecondaryButton("Paste link", {
                clipboard.getText()?.text?.let { input = it; join(it) }
            })
        }
    }
}
