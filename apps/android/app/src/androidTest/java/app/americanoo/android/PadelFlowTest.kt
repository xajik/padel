package app.americanoo.android

import android.content.Intent
import android.net.Uri
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** End-to-end on the emulator against the deployed web API (same backend as the web app). */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
class PadelFlowTest {
    @get:Rule val compose = createEmptyComposeRule()

    private fun launch(data: String? = null): ActivityScenario<MainActivity> {
        val intent = Intent(ApplicationProvider.getApplicationContext(), MainActivity::class.java)
            .putExtra(MainActivity.EXTRA_RESET, true)
        data?.let { intent.action = Intent.ACTION_VIEW; intent.data = Uri.parse(it) }
        return ActivityScenario.launch(intent)
    }

    /** Organizer flow: create on the phone, score round 1, start round 2; the web API sees it. */
    @Test
    fun createScoreAndSyncWithWeb() {
        launch()
        compose.onNodeWithTag("new-game").performClick()
        compose.onNodeWithTag("start-game").performClick()
        compose.waitUntilAtLeastOneExists(hasTestTag("court-1"), 15_000)
        // Registered with the server: the share button shows the 6-character code.
        compose.waitUntil(15_000) { app().repository.games.value.firstOrNull()?.needsCreate == false }
        val code = app().repository.games.value.first().code

        for (court in 1..2) {
            compose.onNodeWithTag("court-$court").performClick()
            compose.onNodeWithTag("score-${10 + court}").performClick()
        }
        compose.waitUntilAtLeastOneExists(hasTestTag("next-round"), 5_000)
        compose.onNodeWithTag("next-round").performClick()
        compose.waitUntilAtLeastOneExists(hasText("Round 2"), 5_000)

        val g = Server.waitFor(code) { it.getJSONObject("state").getInt("current") == 1 }
        assertEquals(listOf(11, 12), listOf(Server.scoreA(g, 0, 0), Server.scoreA(g, 0, 1)))
    }

    /** A game made elsewhere opens from its link; web edits reach the phone; the organizer link edits. */
    @Test
    fun joinFromLinkAndFollowWebChanges() {
        val (code, key) = Server.create("Web check")
        val scenario = launch("americanoo://g/$code")
        compose.waitUntilAtLeastOneExists(hasText("Web check"), 15_000)
        compose.onNodeWithText("view only", substring = true).assertExists()

        Server.request("api/games/$code/mutate", "POST", org.json.JSONObject().put("type", "score").put("court", 1).put("scoreA", 20).put("round", 1), key)
        compose.waitUntilAtLeastOneExists(hasText("20"), 20_000)

        // The https organizer link the web shares opens here too.
        scenario.onActivity { it.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("${Server.BASE}/g/$code?key=$key"), it, MainActivity::class.java)) }
        compose.waitUntil(15_000) { app().repository.game(code)?.canEdit == true }
        compose.onNodeWithTag("court-2").performClick()
        compose.onNodeWithTag("score-9").performClick()
        Server.waitFor(code) { Server.scoreA(it, 0, 1) == 9 }
    }

    @Test
    fun joinByCodeRejectsUnknownGame() {
        launch()
        compose.onNodeWithTag("join-game").performClick()
        compose.onNodeWithTag("join-code").performTextInput("ZZZZZZ")
        compose.onNodeWithTag("join-submit").performClick()
        compose.waitUntilAtLeastOneExists(hasText("No game", substring = true), 15_000)
    }

    private fun app() = ApplicationProvider.getApplicationContext<PadelApplication>()
}
