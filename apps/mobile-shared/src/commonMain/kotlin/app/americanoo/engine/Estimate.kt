package app.americanoo.engine

import kotlinx.serialization.Serializable
import kotlin.math.floor

/** Average seconds per rally point, and changeover between rounds (FR-1.14). */
const val SECONDS_PER_POINT = 35
const val CHANGEOVER_MINUTES = 3

@Serializable
data class Estimate(
    val rounds: Int,
    val matches: Int,
    /** Matches per player (min–max when sit-outs make it uneven). */
    val perPlayerMin: Int,
    val perPlayerMax: Int,
    val byesPerPlayerMax: Int,
    val minutes: Int,
    val openEnded: Boolean,
)

fun roundMinutes(settings: Settings): Double {
    val scoring = settings.scoring
    return when (scoring.type) {
        ScoringType.Total -> (scoring.points ?: 24) * SECONDS_PER_POINT / 60.0 + CHANGEOVER_MINUTES
        ScoringType.FirstTo -> (scoring.points ?: 21) * 1.6 * SECONDS_PER_POINT / 60 + CHANGEOVER_MINUTES
        ScoringType.Timed -> (scoring.minutes ?: 15).toDouble() + CHANGEOVER_MINUTES
        ScoringType.Off -> 15.0 + CHANGEOVER_MINUTES
    }
}

/** Assumes a valid player count for the mode (even in team modes). */
fun estimate(settings: Settings, playerCount: Int): Estimate {
    val planned = plannedRounds(settings, playerCount)
    val rounds = planned ?: autoRounds(settings, playerCount)
    val teams = modeInfo(settings.mode).teams
    val units = if (teams) playerCount / 2 else playerCount
    val perRound = settings.courts * (if (teams) 2 else 4)
    val playingSlots = rounds * minOf(perRound, units)
    val idleSlots = rounds * maxOf(0, units - perRound)
    return Estimate(
        rounds = rounds,
        matches = rounds * minOf(settings.courts, units / (if (teams) 2 else 4)),
        perPlayerMin = playingSlots / units,
        perPlayerMax = (playingSlots + units - 1) / units,
        byesPerPlayerMax = (idleSlots + units - 1) / units,
        minutes = floor(rounds * roundMinutes(settings) + 0.5).toInt(),
        openEnded = planned == null,
    )
}

fun formatDuration(minutes: Int): String {
    val h = minutes / 60
    val m = minutes % 60
    return if (h > 0) "${h}h ${m.toString().padStart(2, '0')}m" else "${m}m"
}
