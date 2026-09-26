package app.americanoo.engine

import kotlinx.serialization.Serializable

@Serializable
data class ModeInfo(
    val id: ModeId,
    val name: String,
    val summary: String,
    /** Players form fixed pairs for the whole game. */
    val teams: Boolean,
    /** Pairings depend on results, so rounds are generated one at a time. */
    val dynamic: Boolean,
    /** Player count must equal courts × 4. */
    val fullCourts: Boolean,
    /** Players are split into two sides (Mixicano). */
    val sides: Boolean,
)

val MODES: List<ModeInfo> = listOf(
    ModeInfo(ModeId.Americano, "Americano", "Partners rotate every round. Everyone collects the points their team scores.",
        teams = false, dynamic = false, fullCourts = false, sides = false),
    ModeInfo(ModeId.TeamAmericano, "Team Americano", "Fixed pairs play a round-robin against every other pair.",
        teams = true, dynamic = false, fullCourts = false, sides = false),
    ModeInfo(ModeId.Mexicano, "Mexicano", "After round one, players are grouped by standings so every match stays close.",
        teams = false, dynamic = true, fullCourts = false, sides = false),
    ModeInfo(ModeId.TeamMexicano, "Team Mexicano", "Fixed pairs are matched against pairs with similar standings each round.",
        teams = true, dynamic = true, fullCourts = false, sides = false),
    ModeInfo(ModeId.Mixicano, "Mixicano", "Mexicano for mixed groups: every team has one player from each side.",
        teams = false, dynamic = true, fullCourts = false, sides = true),
    ModeInfo(ModeId.BeatTheBox, "Beat the Box", "Groups of four play all three partner combinations, then the box winner moves up.",
        teams = false, dynamic = true, fullCourts = true, sides = false),
    ModeInfo(ModeId.UpAndDown, "Up & Down", "Winners move up a court, losers move down, and partners split every round.",
        teams = false, dynamic = true, fullCourts = true, sides = false),
    ModeInfo(ModeId.TeamUpAndDown, "Team Up & Down", "Fixed pairs climb the courts: winning pairs move up, losing pairs move down.",
        teams = true, dynamic = true, fullCourts = true, sides = false),
)

fun modeInfo(id: ModeId): ModeInfo = MODES.first { it.id == id }

const val MIN_PLAYERS = 4
const val MAX_PLAYERS = 24
const val MAX_COURTS = 6

fun maxCourts(playerCount: Int): Int = maxOf(1, minOf(MAX_COURTS, playerCount / 4))

fun defaultSettings(mode: ModeId = ModeId.Americano, playerCount: Int = 8): Settings = Settings(
    mode = mode,
    courts = minOf(2, maxCourts(playerCount)),
    scoring = Scoring(ScoringType.Total, points = 24),
    shuffle = if (modeInfo(mode).dynamic) ShuffleMode.Standings else ShuffleMode.Balanced,
    leaderboard = LeaderboardMode.Points,
    rounds = RoundsSetting.Auto,
    byePoints = ByePoints.None,
)

fun validate(settings: Settings, players: List<Player>): List<ValidationError> {
    val errors = mutableListOf<ValidationError>()
    val info = modeInfo(settings.mode)
    val n = players.size

    if (n < MIN_PLAYERS) errors += ValidationError("TOO_FEW_PLAYERS", "At least $MIN_PLAYERS players are needed.")
    if (n > MAX_PLAYERS) errors += ValidationError("TOO_MANY_PLAYERS", "At most $MAX_PLAYERS players are supported.")

    if (players.map { it.id }.toSet().size != n) {
        errors += ValidationError("DUPLICATE_ID", "Player ids must be unique.")
    }

    if (settings.courts < 1 || settings.courts > maxCourts(n)) {
        errors += ValidationError("INVALID_COURTS", "Choose between 1 and ${maxCourts(n)} courts for $n players.")
    }

    if (info.fullCourts && n != settings.courts * 4) {
        val plural = if (settings.courts > 1) "s" else ""
        errors += ValidationError(
            "MULTIPLE_OF_FOUR",
            "${info.name} needs exactly 4 players per court (${settings.courts * 4} players for ${settings.courts} court$plural).",
        )
    }

    if (info.teams) {
        val byTeam = linkedMapOf<String, Int>()
        for (p in players) {
            val teamId = p.teamId
            if (teamId == null) {
                errors += ValidationError("INVALID_TEAMS", "${p.name} has no partner.")
                break
            }
            byTeam[teamId] = (byTeam[teamId] ?: 0) + 1
        }
        if (byTeam.values.any { it != 2 }) {
            errors += ValidationError("INVALID_TEAMS", "Every team needs exactly two players.")
        }
    }

    if (info.sides) {
        if (players.any { it.side == null }) errors += ValidationError("MISSING_SIDE", "Every player needs a side.")
        val a = players.count { it.side == Side.A }
        val b = players.count { it.side == Side.B }
        if (a != b) errors += ValidationError("UNEQUAL_SIDES", "Sides must be equal ($a vs $b).")
    }

    val scoring = settings.scoring
    if (scoring.type == ScoringType.Total || scoring.type == ScoringType.FirstTo) {
        val p = scoring.points ?: 0
        if (p < 4 || p > 64) errors += ValidationError("INVALID_POINTS", "Points per match must be between 4 and 64.")
    }

    return errors
}

/** Units that take a court slot: single players, or team ids in team modes. */
fun unitsOf(settings: Settings, players: List<Player>): List<String> =
    if (!modeInfo(settings.mode).teams) players.map { it.id } else players.map { it.teamId!! }.distinct()

private tailrec fun gcd(a: Int, b: Int): Int = if (b == 0) a else gcd(b, a % b)

/**
 * Round count for "auto": a full rotation when everyone plays each round,
 * otherwise a whole number of sit-out cycles so byes stay equal.
 */
fun autoRounds(settings: Settings, playerCount: Int): Int {
    val info = modeInfo(settings.mode)
    if (info.id == ModeId.BeatTheBox) return 6

    val units = if (info.teams) playerCount / 2 else playerCount
    val perRound = if (info.teams) settings.courts * 2 else settings.courts * 4
    val idle = maxOf(0, units - perRound)
    val target = minOf(units - 1, if (info.teams) 9 else 10)

    if (idle == 0) return maxOf(1, target)
    val cycle = units / gcd(units, idle)
    if (cycle >= target) return minOf(cycle, 12)
    var rounds = cycle * maxOf(1, target / cycle)
    while (rounds < 4) rounds += cycle
    return rounds
}

fun plannedRounds(settings: Settings, playerCount: Int): Int? = when (val r = settings.rounds) {
    RoundsSetting.Auto -> autoRounds(settings, playerCount)
    is RoundsSetting.Fixed -> maxOf(1, minOf(30, r.count))
    RoundsSetting.Open -> null
}
