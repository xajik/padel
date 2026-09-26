package app.americanoo.android

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import androidx.test.ext.junit.runners.AndroidJUnit4
import app.americanoo.android.ui.game.qrBitmap
import app.americanoo.android.ui.join.ScanReader
import app.americanoo.data.GameLinks
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith

/** The photo path on real pixels: QR (zxing) and a written game code (ML Kit text recognition). */
@RunWith(AndroidJUnit4::class)
class ScanReaderTest {
    private fun textBitmap(vararg lines: Pair<String, Float>): Bitmap {
        val bitmap = Bitmap.createBitmap(900, 420, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap).apply { drawColor(Color.WHITE) }
        var y = 110f
        for ((text, size) in lines) {
            val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.BLACK
                textSize = size
                typeface = if (size > 60) Typeface.create(Typeface.MONOSPACE, Typeface.BOLD) else Typeface.DEFAULT
            }
            canvas.drawText(text, 60f, y, paint)
            y += size * 1.6f
        }
        return bitmap
    }

    @Test
    fun readsQrCode() = runBlocking {
        val text = ScanReader.read(qrBitmap("https://padel-americanoo.com/g/K7Q2MX?key=abc", 600))
        assertEquals("K7Q2MX", GameLinks.candidates(text).first().code)
        assertEquals("abc", GameLinks.candidates(text).first().organizerKey)
    }

    @Test
    fun readsWrittenGameCode() = runBlocking {
        val text = ScanReader.read(textBitmap("Tonight's game" to 40f, "Game code" to 40f, "B8RARS" to 110f))
        assertEquals("OCR read: $text", "B8RARS", GameLinks.candidates(text).firstOrNull()?.code)
    }

    @Test
    fun nothingToJoin() = runBlocking {
        val text = ScanReader.read(textBitmap("Just a padel court" to 50f))
        assertFalse("OCR read: $text", ScanReader.hasGame(text))
    }
}
