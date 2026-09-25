package app.padel.android

import app.padel.engine.ModeId
import app.padel.engine.Player
import app.padel.engine.createGame
import app.padel.engine.defaultSettings
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
