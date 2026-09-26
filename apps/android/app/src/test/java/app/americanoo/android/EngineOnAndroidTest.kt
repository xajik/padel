package app.americanoo.android

import app.americanoo.engine.ModeId
import app.americanoo.engine.Player
import app.americanoo.engine.createGame
import app.americanoo.engine.defaultSettings
import org.junit.Assert.assertEquals
import org.junit.Test

/** The engine is covered by the shared fixtures; this checks the app resolves the KMP module. */
class EngineOnAndroidTest {
    @Test
    fun americanoEightPlayersHasSevenRounds() {
        val players = (0 until 8).map { Player("p$it", "Player $it") }
        val game = createGame(defaultSettings(ModeId.Americano, 8), players, "seed-1")
        assertEquals(7, game.rounds.size)
    }
}
