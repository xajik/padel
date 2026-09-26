package app.americanoo.android.ui.join

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import app.americanoo.data.GameLinks
import com.google.android.gms.tasks.Task
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.MultiFormatReader
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.common.HybridBinarizer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume

/**
 * Reads everything a photo or screenshot can tell us about a game: a QR payload (zxing) and
 * printed or on-screen text (ML Kit), e.g. a code on a whiteboard or a screenshot of the share
 * sheet. The shared `GameLinks.candidates` / `joinScanned` decide which part is the game.
 */
object ScanReader {
    suspend fun read(context: Context, uri: Uri): String = withContext(Dispatchers.Default) {
        val bitmap = decode(context, uri) ?: return@withContext ""
        read(bitmap)
    }

    suspend fun read(bitmap: Bitmap): String {
        val qr = runCatching { decodeQr(bitmap) }.getOrNull()
        val text = recognizeText(bitmap)
        return listOfNotNull(qr, text).joinToString("\n")
    }

    fun hasGame(text: String) = GameLinks.candidates(text).isNotEmpty()

    private fun decodeQr(bitmap: Bitmap): String {
        val pixels = IntArray(bitmap.width * bitmap.height).also { bitmap.getPixels(it, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height) }
        val source = RGBLuminanceSource(bitmap.width, bitmap.height, pixels)
        return MultiFormatReader().decode(BinaryBitmap(HybridBinarizer(source)), mapOf(DecodeHintType.TRY_HARDER to true)).text
    }

    private suspend fun recognizeText(bitmap: Bitmap): String? {
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        return try {
            recognizer.process(InputImage.fromBitmap(bitmap, 0)).awaitOrNull()?.text
        } finally {
            recognizer.close()
        }
    }

    /** Photos can be 50 MP: decode at most ~2000 px on the long side (plenty for text and QR). */
    private fun decode(context: Context, uri: Uri): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        context.contentResolver.openInputStream(uri).use { BitmapFactory.decodeStream(it, null, bounds) }
        var sample = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / sample > 2000) sample *= 2
        val options = BitmapFactory.Options().apply { inSampleSize = sample }
        return context.contentResolver.openInputStream(uri).use { BitmapFactory.decodeStream(it, null, options) }
    }
}

private suspend fun <T> Task<T>.awaitOrNull(): T? = suspendCancellableCoroutine { cont ->
    addOnSuccessListener { cont.resume(it) }
    addOnFailureListener { cont.resume(null) }
}
