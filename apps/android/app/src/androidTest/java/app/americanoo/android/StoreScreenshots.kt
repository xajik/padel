package app.americanoo.android

import android.content.Intent
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Play Store screenshots from real screens and demo games. Runs only when asked:
 * `make android-screenshots` (instrumentation argument storeScreenshots=true).
 * Files land in /data/local/tmp/padel-shots and are pulled by scripts/android-screenshots.sh.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
class StoreScreenshots {
    @get:Rule val compose = createEmptyComposeRule()

    @Test
    fun storeScreenshots() {
        assumeTrue(InstrumentationRegistry.getArguments().getString("storeScreenshots") == "true")
        val context = ApplicationProvider.getApplicationContext<PadelApplication>()
        ActivityScenario.launch<MainActivity>(Intent(context, MainActivity::class.java).putExtra(MainActivity.EXTRA_RESET, true).putExtra(MainActivity.EXTRA_DEMO, true))

        // Demo seeding is done when tonight's game reached round 3 and nothing is left to sync.
        compose.waitUntil(90_000) {
            val games = context.repository.games.value
            games.size == 2 && games.any { it.game.name == "Tuesday Club Night" && it.game.state.current == 2 } &&
                games.none { it.needsCreate || it.pending.isNotEmpty() }
        }
        compose.waitUntilAtLeastOneExists(hasTestTag("game-Tuesday Club Night"), 10_000)
        settle()
        snap("05-home")

        compose.onNodeWithTag("game-Tuesday Club Night").performClick()
        compose.waitUntilAtLeastOneExists(hasTestTag("court-2"), 10_000)
        settle()
        snap("01-game")

        compose.onNodeWithTag("court-2").performClick()
        compose.waitUntilAtLeastOneExists(hasTestTag("score-13"), 5_000)
        settle()
        snap("02-score-pad")
        InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK)
        settle()

        compose.onNodeWithTag("tab-Leaderboard").performClick()
        settle()
        snap("03-leaderboard")
        compose.onNodeWithTag("tab-Round").performClick()

        compose.onNodeWithTag("share-game").performClick()
        compose.waitUntilAtLeastOneExists(hasTestTag("share-code"), 5_000)
        settle()
        snap("04-share-qr")
        InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK)
        settle()
        compose.onNodeWithText("Back").performClick()

        compose.onNodeWithTag("game-Sunday Mexicano").performClick()
        compose.waitUntilAtLeastOneExists(hasText("1st"), 10_000)
        settle()
        snap("06-podium")
        compose.onNodeWithText("Back").performClick()

        compose.onNodeWithTag("new-game").performClick()
        settle()
        snap("07-new-game")
    }

    private fun settle() {
        compose.waitForIdle()
        Thread.sleep(800)
    }

    /** Shell screencap into /data/local/tmp: survives the test APK uninstall, pulled by the script. */
    private fun snap(name: String) {
        shell("mkdir -p $DIR")
        shell("screencap -p $DIR/$name.png")
    }

    private fun shell(command: String) {
        InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand(command).use { fd ->
            android.os.ParcelFileDescriptor.AutoCloseInputStream(fd).readBytes()
        }
    }

    companion object {
        const val DIR = "/data/local/tmp/padel-shots"
    }
}
