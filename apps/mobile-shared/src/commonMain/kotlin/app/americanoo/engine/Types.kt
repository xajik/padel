package app.americanoo.engine

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlin.native.ObjCName

/**
 * Kotlin port of packages/engine/src/types.ts. JSON shapes match the TS engine exactly.
 * `@ObjCName` keeps multi-word enum cases camelCase in Swift (Kotlin/Native would lowercase them).
 */

@Serializable
enum class ModeId {
    @SerialName("americano") Americano,
    @SerialName("team-americano") @ObjCName("teamAmericano") TeamAmericano,
    @SerialName("mexicano") Mexicano,
    @SerialName("team-mexicano") @ObjCName("teamMexicano") TeamMexicano,
    @SerialName("mixicano") Mixicano,
    @SerialName("beat-the-box") @ObjCName("beatTheBox") BeatTheBox,
    @SerialName("up-and-down") @ObjCName("upAndDown") UpAndDown,
    @SerialName("team-up-and-down") @ObjCName("teamUpAndDown") TeamUpAndDown,
}

@Serializable
enum class ScoringType {
    @SerialName("total") Total,
    @SerialName("first_to") @ObjCName("firstTo") FirstTo,
    @SerialName("timed") Timed,
    @SerialName("off") Off,
}

@Serializable
enum class ShuffleMode {
    @SerialName("balanced") Balanced,
    @SerialName("random") Random,
    @SerialName("standings") Standings,
    @SerialName("manual") Manual,
}

@Serializable
enum class LeaderboardMode {
    @SerialName("points") Points,
    @SerialName("wins") Wins,
    @SerialName("average") Average,
}

@Serializable
enum class Side { A, B }

@Serializable
enum class ByePoints {
    @SerialName("none") None,
    @SerialName("average") Average,
}

/** Serialized with a `type` discriminator: {"type":"auto"} | {"type":"fixed","count":n} | {"type":"open"}. */
@Serializable
sealed class RoundsSetting {
    @Serializable @SerialName("auto") data object Auto : RoundsSetting()
    @Serializable @SerialName("fixed") data class Fixed(val count: Int) : RoundsSetting()
    @Serializable @SerialName("open") data object Open : RoundsSetting()
}

@Serializable
data class Scoring(
    val type: ScoringType,
    /** Total points per match (total) or target (first_to). */
    val points: Int? = null,
    /** Minutes per round (timed). */
    val minutes: Int? = null,
)

@Serializable
data class Settings(
    val mode: ModeId,
    val courts: Int,
    val scoring: Scoring,
    val shuffle: ShuffleMode,
    val leaderboard: LeaderboardMode,
    val rounds: RoundsSetting,
    /** Points credited to a player sitting out. */
    val byePoints: ByePoints,
)

@Serializable
data class Player(
    val id: String,
    val name: String,
    /** Mixicano side. */
    val side: Side? = null,
    /** Team modes: players sharing a teamId play together all game. */
    val teamId: String? = null,
)

/** Always two player ids. */
typealias Team = List<String>

@Serializable
data class Match(
    val court: Int,
    val teamA: Team,
    val teamB: Team,
    val scoreA: Int?,
    val scoreB: Int?,
)

@Serializable
data class Round(
    val index: Int,
    val matches: List<Match>,
    /** Player ids sitting out. */
    val byes: List<String>,
)

@Serializable
data class GameState(
    val settings: Settings,
    val players: List<Player>,
    val seed: String,
    /** Rounds generated so far (schedule modes pre-generate every round). */
    val rounds: List<Round>,
    /** Index of the round currently being played. */
    val current: Int,
    /** Planned round count; null for open-ended games. */
    val plannedRounds: Int?,
)

@Serializable
data class Standing(
    /** Player id, or team id in team modes. */
    val id: String,
    val name: String,
    val playerIds: List<String>,
    val rank: Int,
    val played: Int,
    val wins: Int,
    val draws: Int,
    val losses: Int,
    val pointsFor: Int,
    val pointsAgainst: Int,
    val diff: Int,
    val byes: Int,
    /** Points including bye compensation; the value leaderboards sort on. */
    val score: Double,
    /** Positive = moved up since the previous round. */
    val movement: Int,
)

@Serializable
data class ValidationError(val code: String, val message: String)

class EngineError(val code: String, message: String) : Exception(message)
