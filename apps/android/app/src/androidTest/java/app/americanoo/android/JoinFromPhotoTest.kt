package app.americanoo.android

import android.content.ContentValues
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.provider.MediaStore
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The real user path: a screenshot showing only a game code is in the gallery; Join → From photo →
 * pick it in the system photo picker → the game opens.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
class JoinFromPhotoTest {
    @get:Rule val compose = createEmptyComposeRule()

    @Test
    fun joinsGameFromScreenshotWithCode() {
        val (code, _) = Server.create("Photo join")
        val context = ApplicationProvider.getApplicationContext<PadelApplication>()

        // A "screenshot" of the share sheet: title, label and the code in a big monospace font.
        val bitmap = Bitmap.createBitmap(1080, 1400, Bitmap.Config.ARGB_8888)
        Canvas(bitmap).apply {
            drawColor(Color.WHITE)
            val body = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.BLACK; textSize = 48f }
            drawText("Share game", 80f, 200f, body)
            drawText("Game code", 80f, 600f, body)
            drawText(code, 80f, 760f, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.BLACK; textSize = 140f; typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD) })
        }
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, "padel-code-$code.png")
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
        }
        val uri = context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)!!
        context.contentResolver.openOutputStream(uri).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it!!) }

        ActivityScenario.launch<MainActivity>(Intent(context, MainActivity::class.java).putExtra(MainActivity.EXTRA_RESET, true))
        compose.onNodeWithTag("join-game").performClick()
        compose.onNodeWithTag("from-photo").performClick()

        // System photo picker: newest image first.
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        val photo = device.wait(Until.findObject(By.descContains("Photo taken")), 10_000)
            ?: device.wait(Until.findObject(By.clazz("android.widget.ImageView").clickable(true)), 5_000)
        assertTrue("photo picker did not show the image", photo != null)
        photo.click()

        compose.waitUntilAtLeastOneExists(hasText("Photo join"), 30_000)
        context.contentResolver.delete(uri, null, null)
    }
}
