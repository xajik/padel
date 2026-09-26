package app.padel.android

import android.content.Intent
import android.net.Uri
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithTag
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
 * Android's part of the cross-device scenario driven by scripts/e2e-local.sh: sees the iPhone's
 * court 1 score, then scores court 2. Arguments: e2eCode, e2eKey.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
class CrossDeviceTest {
    @get:Rule val compose = createEmptyComposeRule()

    @Test
    fun seeIphoneScoreAndScoreCourtTwo() {
        val args = InstrumentationRegistry.getArguments()
        val code = args.getString("e2eCode")
        val key = args.getString("e2eKey")
        assumeTrue("Run through scripts/e2e-local.sh", code != null && key != null)

        val context = ApplicationProvider.getApplicationContext<PadelApplication>()
        ActivityScenario.launch<MainActivity>(
            Intent(Intent.ACTION_VIEW, Uri.parse("padel://g/$code?key=$key"), context, MainActivity::class.java).putExtra(MainActivity.EXTRA_RESET, true),
        )
        compose.waitUntil(15_000) { context.repository.game(code!!)?.canEdit == true }
        // The iPhone entered 16–8 on court 1.
        compose.waitUntilAtLeastOneExists(hasText("16"), 15_000)
        compose.waitUntilAtLeastOneExists(hasText("8"), 5_000)

        compose.onNodeWithTag("court-2").performClick()
        compose.onNodeWithTag("score-9").performClick()
        Server.waitFor(code!!) { Server.scoreA(it, 0, 1) == 9 }
    }
}
