package app.americanoo.data

import app.americanoo.engine.ByePoints
import app.americanoo.engine.Estimate
import app.americanoo.engine.LeaderboardMode
import app.americanoo.engine.ModeId
import app.americanoo.engine.RoundsSetting
import app.americanoo.engine.Scoring
import app.americanoo.engine.ScoringType
import app.americanoo.engine.Settings
import app.americanoo.engine.Side
import app.americanoo.engine.ValidationError
import app.americanoo.engine.defaultSettings
import app.americanoo.engine.estimate
import app.americanoo.engine.maxCourts
import app.americanoo.engine.modeInfo
import app.americanoo.engine.validate

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
