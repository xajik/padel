package app.padel.engine

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Throws(EngineError::class)
fun createGame(settings: Settings, players: List<Player>, seed: String = randomSeed()): GameState {
    val errors = validate(settings, players)
    if (errors.isNotEmpty()) throw EngineError(errors[0].code, errors[0].message)

    val planned = plannedRounds(settings, players.size)
    val base = GameState(settings, players, seed, rounds = emptyList(), current = 0, plannedRounds = planned)
    val info = modeInfo(settings.mode)

    val rounds = if (!info.dynamic && planned != null) generateSchedule(base, planned) else listOf(generateRound(base, 0))
    return base.copy(rounds = rounds)
}

@Serializable
enum class AdvanceStatus {
    @SerialName("ready") Ready,
    @SerialName("incomplete") Incomplete,
    @SerialName("finished") Finished,
}

fun advanceStatus(state: GameState): AdvanceStatus {
    val round = state.rounds.getOrNull(state.current)
    if (round == null || !isRoundComplete(round)) return AdvanceStatus.Incomplete
    val planned = state.plannedRounds
    if (planned != null && state.current + 1 >= planned) return AdvanceStatus.Finished
    return AdvanceStatus.Ready
}

/** Move to the next round, generating it when needed. */
@Throws(EngineError::class)
fun nextRound(state: GameState): GameState {
    when (advanceStatus(state)) {
        AdvanceStatus.Incomplete -> throw EngineError("ROUND_INCOMPLETE", "Enter every score before starting the next round.")
        AdvanceStatus.Finished -> throw EngineError("NO_MORE_ROUNDS", "This was the last round.")
        AdvanceStatus.Ready -> Unit
    }
    val next = state.current + 1
    val rounds = if (next < state.rounds.size) state.rounds else state.rounds + generateRound(state, next)
    return state.copy(rounds = rounds, current = next)
}

/**
 * Normalise a score for the game's scoring type. For "total", a missing side
 * is filled in so the two sides add up to the match total.
 */
@Throws(EngineError::class)
fun normalizeScore(scoring: Scoring, a: Int, b: Int? = null): Pair<Int, Int> {
    if (a < 0 || (b != null && b < 0)) {
        throw EngineError("INVALID_SCORE", "Scores must be whole numbers of zero or more.")
    }
    return when (scoring.type) {
        ScoringType.Total -> {
            val total = scoring.points ?: 24
            val other = b ?: (total - a)
            if (a > total || a + other != total) throw EngineError("INVALID_SCORE", "Scores must add up to $total.")
            Pair(a, other)
        }
        ScoringType.FirstTo -> {
            val target = scoring.points ?: 21
            if (b == null) throw EngineError("INVALID_SCORE", "Enter both scores.")
            if (maxOf(a, b) != target || minOf(a, b) >= target) {
                throw EngineError("INVALID_SCORE", "One team must reach exactly $target.")
            }
            Pair(a, b)
        }
        ScoringType.Off -> {
            val other = b ?: 0
            if (a > other) Pair(1, 0) else if (a < other) Pair(0, 1) else Pair(0, 0)
        }
        ScoringType.Timed -> {
            if (b == null) throw EngineError("INVALID_SCORE", "Enter both scores.")
            Pair(a, b)
        }
    }
}

data class ScoreResult(
    val state: GameState,
    /** Round indexes that were regenerated because earlier results changed. */
    val regenerated: List<Int>,
)

/** Pass `scoreA = null` to clear a match. */
@Throws(EngineError::class)
fun setScore(state: GameState, roundIndex: Int, matchIndex: Int, scoreA: Int?, scoreB: Int? = null): ScoreResult {
    val round = state.rounds.getOrNull(roundIndex)
    if (round == null || roundIndex > state.current) throw EngineError("INVALID_ROUND", "That round has not started yet.")
    if (matchIndex !in round.matches.indices) throw EngineError("INVALID_MATCH", "No such match.")

    val score = if (scoreA == null) null else normalizeScore(state.settings.scoring, scoreA, scoreB)
    val rounds = state.rounds.mapIndexed { i, r ->
        if (i != roundIndex) r
        else r.copy(matches = r.matches.mapIndexed { j, m -> if (j == matchIndex) m.copy(scoreA = score?.first, scoreB = score?.second) else m })
    }
    var next = state.copy(rounds = rounds)

    val regenerated = mutableListOf<Int>()
    if (modeInfo(state.settings.mode).dynamic) {
        for (i in roundIndex + 1 until next.rounds.size) {
            if (next.rounds[i].matches.any(::isScored)) continue
            val r = generateRound(next, i)
            next = next.copy(rounds = next.rounds.mapIndexed { j, x -> if (j == i) r else x })
            regenerated += i
        }
    }
    return ScoreResult(next, regenerated)
}

/** Manual shuffle: swap two players in a round nobody has scored yet (either may be sitting out). */
@Throws(EngineError::class)
fun swapPlayers(state: GameState, roundIndex: Int, idA: String, idB: String): GameState {
    val round = state.rounds.getOrNull(roundIndex) ?: throw EngineError("INVALID_ROUND", "No such round.")
    if (round.matches.any(::isScored)) throw EngineError("ROUND_STARTED", "Players can only be swapped before scoring starts.")
    if (modeInfo(state.settings.mode).teams) throw EngineError("FIXED_TEAMS", "Teams are fixed in this mode.")
    fun swap(id: String) = if (id == idA) idB else if (id == idB) idA else id
    val swapped = round.copy(
        matches = round.matches.map { m ->
            m.copy(teamA = listOf(swap(m.teamA[0]), swap(m.teamA[1])), teamB = listOf(swap(m.teamB[0]), swap(m.teamB[1])))
        },
        byes = round.byes.map(::swap),
    )
    return state.copy(rounds = state.rounds.mapIndexed { i, r -> if (i == roundIndex) swapped else r })
}

/** Player count per court slot helper for UIs. */
fun unitsCount(state: GameState): Int = unitsOf(state.settings, state.players).size
