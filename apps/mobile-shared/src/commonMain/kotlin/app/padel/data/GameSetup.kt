package app.padel.data

import app.padel.engine.ByePoints
import app.padel.engine.Estimate
import app.padel.engine.LeaderboardMode
import app.padel.engine.ModeId
import app.padel.engine.RoundsSetting
import app.padel.engine.Scoring
import app.padel.engine.ScoringType
import app.padel.engine.Settings
import app.padel.engine.Side
import app.padel.engine.ValidationError
import app.padel.engine.defaultSettings
import app.padel.engine.estimate
import app.padel.engine.maxCourts
import app.padel.engine.modeInfo
import app.padel.engine.validate

/**
 * The new-game form's rules, shared by both apps (and matching the web setup wizard):
 * sensible defaults per format, validation and the duration estimate.
 */
object GameSetup {
    val POINT_OPTIONS = listOf(16, 21, 24, 32)

    /**
     * @param rounds null = auto (a full rotation), 0 = open-ended, n = fixed.
     */
    fun settings(mode: ModeId, playerCount: Int, courts: Int, scoringType: ScoringType, points: Int, rounds: Int?, byeAverage: Boolean): Settings {
        val base = defaultSettings(mode, playerCount)
        val info = modeInfo(mode)
        return base.copy(
            courts = if (info.fullCourts) maxOf(1, playerCount / 4) else courts.coerceIn(1, maxCourts(playerCount)),
            scoring = when (scoringType) {
                ScoringType.Total, ScoringType.FirstTo -> Scoring(scoringType, points = points)
                ScoringType.Timed -> Scoring(ScoringType.Timed, minutes = 15)
                ScoringType.Off -> Scoring(ScoringType.Off)
            },
            leaderboard = if (scoringType == ScoringType.Off) LeaderboardMode.Wins else LeaderboardMode.Points,
            rounds = when (rounds) {
                null -> RoundsSetting.Auto
                0 -> RoundsSetting.Open
                else -> RoundsSetting.Fixed(rounds)
            },
            byePoints = if (byeAverage) ByePoints.Average else ByePoints.None,
        )
    }

    /** First problem to show under the form, or null when the game can start. */
    fun problem(settings: Settings, names: List<String>, sides: List<Side>? = null): ValidationError? =
        validate(settings, buildPlayers(settings.mode, names, sides)).firstOrNull()

    fun estimateFor(settings: Settings, playerCount: Int): Estimate? =
        if (modeInfo(settings.mode).teams && playerCount % 2 != 0) null else estimate(settings, maxOf(playerCount, 1))

    /** Default roster so a quick game needs no typing (renamed later on court). */
    fun defaultNames(count: Int): List<String> = (1..count).map { "Player $it" }
}
