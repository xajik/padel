package app.americanoo.android

import android.graphics.Bitmap
import android.graphics.Canvas
import android.view.View
import android.widget.FrameLayout
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.appwidget.compose
import androidx.glance.ExperimentalGlanceApi
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import app.americanoo.android.widget.ActiveGameWidget
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Renders the home-screen widget (Glance → RemoteViews → bitmap) at its three sizes, with a live
 * demo game, into /data/local/tmp/padel-widgets for review. Placing widgets on a launcher can't
 * be automated, so this is how the widget UI gets checked.
 */
@RunWith(AndroidJUnit4::class)
class WidgetRenderTest {
    @OptIn(ExperimentalGlanceApi::class)
    @Test
    fun rendersActiveGameAtEverySize() = runBlocking {
        val app = ApplicationProvider.getApplicationContext<PadelApplication>()
        app.repository.clear()
        assertNull(DemoData.seed(app.repository))
        assertTrue(app.repository.activeGame() != null)

        shell("mkdir -p $DIR")
        for ((name, size) in listOf("small" to DpSize(160.dp, 160.dp), "wide" to DpSize(320.dp, 160.dp), "large" to DpSize(320.dp, 240.dp))) {
            val views = ActiveGameWidget().compose(app, size = size)
            val density = app.resources.displayMetrics.density
            val w = (size.width.value * density).toInt()
            val h = (size.height.value * density).toInt()
            val bitmap = InstrumentationRegistry.getInstrumentation().let { inst ->
                var out: Bitmap? = null
                inst.runOnMainSync {
                    val parent = FrameLayout(app)
                    val view = views.apply(app, parent)
                    view.measure(View.MeasureSpec.makeMeasureSpec(w, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(h, View.MeasureSpec.EXACTLY))
                    view.layout(0, 0, w, h)
                    out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).also { view.draw(Canvas(it)) }
                }
                out!!
            }
            val file = java.io.File(app.externalCacheDir, "$name.png") // readable by the shell user
            file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
            shell("cp ${file.absolutePath} $DIR/$name.png")
        }
    }

    private fun shell(command: String) {
        InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand(command).use { fd ->
            android.os.ParcelFileDescriptor.AutoCloseInputStream(fd).readBytes()
        }
    }

    companion object {
        const val DIR = "/data/local/tmp/padel-widgets"
    }
}
