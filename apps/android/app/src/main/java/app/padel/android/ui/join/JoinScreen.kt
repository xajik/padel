package app.padel.android.ui.join

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
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
import app.padel.android.AppViewModel
import app.padel.android.ui.components.PrimaryButton
import app.padel.android.ui.components.SecondaryButton
import app.padel.android.ui.theme.GeistMono
import app.padel.android.ui.theme.PadelIcon
import app.padel.android.ui.theme.PadelTheme
import app.padel.android.ui.theme.Space
import app.padel.android.ui.theme.StateColors
import app.padel.data.GameLinks
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.MultiFormatReader
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.common.HybridBinarizer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

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

    val photo = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            val text = withContext(Dispatchers.Default) { decodeQr(context, uri) }
            if (text != null) { input = text; join(text) } else error = "No QR code found in that image."
        }
    }

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
            Text("Enter the 6-character code from the organizer, or scan their QR code.", style = MaterialTheme.typography.bodyLarge, color = PadelTheme.colors.mutedForeground)
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
                SecondaryButton("Scan QR", {
                    // Google code scanner: no camera permission, UI provided by Play services.
                    val options = GmsBarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
                    GmsBarcodeScanning.getClient(context, options).startScan()
                        .addOnSuccessListener { code -> code.rawValue?.let { input = it; join(it) } }
                        .addOnFailureListener { error = "Camera scanning isn't available here. Try a photo or the code." }
                }, Modifier.weight(1f), icon = PadelIcon.Scoreboard)
                SecondaryButton("QR from photo", { photo.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, Modifier.weight(1f))
            }
            SecondaryButton("Paste link", {
                clipboard.getText()?.text?.let { input = it; join(it) }
            })
        }
    }
}

private fun decodeQr(context: Context, uri: Uri): String? = runCatching {
    val bitmap = context.contentResolver.openInputStream(uri).use { BitmapFactory.decodeStream(it) } ?: return null
    val pixels = IntArray(bitmap.width * bitmap.height).also { bitmap.getPixels(it, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height) }
    val source = RGBLuminanceSource(bitmap.width, bitmap.height, pixels)
    MultiFormatReader().decode(BinaryBitmap(HybridBinarizer(source)), mapOf(DecodeHintType.TRY_HARDER to true)).text
}.getOrNull()?.takeIf { GameLinks.parse(it) != null }
