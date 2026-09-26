package app.padel.android.ui.join

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.ImageAnalysis
import androidx.camera.mlkit.vision.MlKitAnalyzer
import androidx.camera.view.CameraController
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import app.padel.android.ui.theme.Space
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

/**
 * Full-screen camera that recognises a game QR code or a game code written or shown anywhere
 * (CameraX + ML Kit barcode and text recognition on every frame). Calls [onFound] once with all
 * text in view when it contains something that looks like a game.
 */
@Composable
fun CodeScanner(onFound: (String) -> Unit, onDismiss: () -> Unit) {
    val context = LocalContext.current
    var granted by remember { mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        granted = ok
        if (!ok) onDismiss()
    }
    LaunchedEffect(Unit) { if (!granted) permission.launch(Manifest.permission.CAMERA) }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            if (granted) CameraPreview(onFound)
            Column(Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(Space.s6), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Point at a QR code or a game code", color = Color.White)
            }
            TextButton(onClick = onDismiss, modifier = Modifier.align(Alignment.TopEnd).statusBarsPadding().padding(Space.s2)) {
                Text("Cancel", color = Color.White)
            }
        }
    }
}

@Composable
private fun CameraPreview(onFound: (String) -> Unit) {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current
    val barcodes = remember { BarcodeScanning.getClient(BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()) }
    val texts = remember { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }
    var done by remember { mutableStateOf(false) }
    val controller = remember {
        LifecycleCameraController(context).apply {
            setEnabledUseCases(CameraController.IMAGE_ANALYSIS)
            imageAnalysisBackpressureStrategy = ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST
            setImageAnalysisAnalyzer(
                ContextCompat.getMainExecutor(context),
                MlKitAnalyzer(listOf(barcodes, texts), ImageAnalysis.COORDINATE_SYSTEM_ORIGINAL, ContextCompat.getMainExecutor(context)) { result ->
                    // A QR in view wins over nearby text; both go through the shared candidates.
                    val qr = result.getValue(barcodes)?.mapNotNull { it.rawValue }.orEmpty()
                    val text = result.getValue(texts)?.text
                    val all = (qr + listOfNotNull(text)).joinToString("\n")
                    if (!done && ScanReader.hasGame(all)) {
                        done = true
                        onFound(all)
                    }
                },
            )
        }
    }
    DisposableEffect(lifecycle) {
        controller.bindToLifecycle(lifecycle)
        onDispose {
            controller.unbind()
            barcodes.close()
            texts.close()
        }
    }
    AndroidView(factory = { PreviewView(it).apply { this.controller = controller } }, modifier = Modifier.fillMaxSize())
}
