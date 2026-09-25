package app.padel.engine

import kotlin.math.floor

fun isScored(m: Match): Boolean = m.scoreA != null && m.scoreB != null

fun isRoundComplete(r: Round): Boolean = r.matches.all(::isScored)

/** 1 = team A won, -1 = team B won, 0 = draw. */
fun matchOutcome(m: Match): Int {
    val a = m.scoreA ?: 0
    val b = m.scoreB ?: 0
    return if (a > b) 1 else if (a < b) -1 else 0
}

private class Acc(
    val id: String,
    var name: String,
    val playerIds: MutableList<String>,
) {
    var played = 0
    var wins = 0
    var draws = 0
    var losses = 0
    var pointsFor = 0
    var pointsAgainst = 0
    var byes = 0
}

private fun unitKey(state: GameState, playerId: String, byPlayer: Map<String, Player>): String =
    if (modeInfo(state.settings.mode).teams) byPlayer.getValue(playerId).teamId!! else playerId

fun teamName(players: List<Player>, ids: List<String>): String =
    ids.joinToString(" & ") { id -> players.find { it.id == id }?.name ?: "?" }

/**
 * Standings from every scored match in rounds with index < [uptoRound]
 * (all rounds by default). Byes count only for completed rounds.
 */
fun computeStandings(state: GameState, uptoRound: Int = Int.MAX_VALUE): List<Standing> {
    val current = rank(state, accumulate(state, uptoRound))
    val completed = state.rounds.filter { it.index < uptoRound && isRoundComplete(it) }
    if (completed.size < 2) return current

    val lastDone = completed.last().index
    val previous = rank(state, accumulate(state, lastDone))
    val prevRank = previous.associate { it.id to it.rank }
    return current.map { it.copy(movement = (prevRank[it.id] ?: it.rank) - it.rank) }
}

private fun accumulate(state: GameState, uptoRound: Int): Map<String, Acc> {
    val byPlayer = state.players.associateBy { it.id }
    val acc = linkedMapOf<String, Acc>()
    val teams = modeInfo(state.settings.mode).teams

    for (p in state.players) {
        val key = unitKey(state, p.id, byPlayer)
        val entry = acc[key]
        if (entry != null) {
            entry.playerIds += p.id
            continue
        }
        acc[key] = Acc(key, p.name, mutableListOf(p.id))
    }
    if (teams) for (a in acc.values) a.name = teamName(state.players, a.playerIds)

    for (round in state.rounds) {
        if (round.index >= uptoRound) continue
        for (m in round.matches) {
            if (!isScored(m)) continue
            val outcome = matchOutcome(m)
            credit(acc, if (teams) listOf(unitKey(state, m.teamA[0], byPlayer)) else m.teamA, m.scoreA!!, m.scoreB!!, outcome)
            credit(acc, if (teams) listOf(unitKey(state, m.teamB[0], byPlayer)) else m.teamB, m.scoreB, m.scoreA, -outcome)
        }
        if (isRoundComplete(round)) {
            val byeUnits = round.byes.map { unitKey(state, it, byPlayer) }.toSet()
            for (u in byeUnits) acc.getValue(u).byes += 1
        }
    }
    return acc
}

private fun credit(acc: Map<String, Acc>, ids: List<String>, pf: Int, pa: Int, outcome: Int) {
    for (id in ids) {
        val a = acc.getValue(id)
        a.played += 1
        a.pointsFor += pf
        a.pointsAgainst += pa
        when (outcome) {
            1 -> a.wins += 1
            -1 -> a.losses += 1
            else -> a.draws += 1
        }
    }
}

private class Row(val a: Acc, val score: Double, val diff: Int, val keys: List<Double>)

private fun rank(state: GameState, acc: Map<String, Acc>): List<Standing> {
    val settings = state.settings
    val mode = if (settings.scoring.type == ScoringType.Off) LeaderboardMode.Wins else settings.leaderboard
    val fallbackAvg = (settings.scoring.points ?: 0) / 2.0

    val rows = acc.values.map { a ->
        val avg = if (a.played > 0) a.pointsFor.toDouble() / a.played else 0.0
        val byeComp = if (settings.byePoints == ByePoints.Average) a.byes * (if (a.played > 0) avg else fallbackAvg) else 0.0
        val total = a.pointsFor + byeComp
        val winScore = a.wins + a.draws / 2.0
        val score = when (mode) {
            LeaderboardMode.Points -> round2(total)
            LeaderboardMode.Wins -> winScore
            LeaderboardMode.Average ->
                round2(if (a.played > 0) total / (a.played + (if (byeComp != 0.0) a.byes else 0)) else 0.0)
        }
        val diff = a.pointsFor - a.pointsAgainst
        val keys = when (mode) {
            LeaderboardMode.Points -> listOf(score, diff.toDouble(), a.wins.toDouble())
            LeaderboardMode.Wins -> listOf(winScore, diff.toDouble(), a.pointsFor.toDouble())
            LeaderboardMode.Average -> listOf(score, if (a.played > 0) diff.toDouble() / a.played else 0.0, winScore)
        }
        Row(a, score, diff, keys)
    }

    val sorted = rows.sortedWith { x, y ->
        for (i in x.keys.indices) {
            if (x.keys[i] != y.keys[i]) return@sortedWith y.keys[i].compareTo(x.keys[i])
        }
        localeCompare(x.a.name, y.a.name)
    }

    var lastKeys: List<Double>? = null
    var lastRank = 0
    return sorted.mapIndexed { i, r ->
        val same = lastKeys == r.keys
        val rankValue = if (same) lastRank else i + 1
        lastKeys = r.keys
        lastRank = rankValue
        val a = r.a
        Standing(
            id = a.id,
            name = a.name,
            playerIds = a.playerIds.toList(),
            rank = rankValue,
            played = a.played,
            wins = a.wins,
            draws = a.draws,
            losses = a.losses,
            pointsFor = a.pointsFor,
            pointsAgainst = a.pointsAgainst,
            diff = r.diff,
            byes = a.byes,
            score = r.score,
            movement = 0,
        )
    }
}

/** `Math.round(n * 100) / 100` — JS rounds halves towards +∞. */
private fun round2(n: Double): Double = floor(n * 100 + 0.5) / 100

/**
 * Approximates `String.prototype.localeCompare` (ICU root collation) for player names:
 * punctuation and spaces sort before digits and letters, letters compare case-insensitively
 * first, and lower case sorts before upper case on an otherwise equal name.
 */
internal fun localeCompare(a: String, b: String): Int {
    fun weight(c: Char): Int = when {
        c.isLetter() -> 2
        c.isDigit() -> 1
        else -> 0
    }
    val n = minOf(a.length, b.length)
    for (i in 0 until n) {
        val x = a[i]
        val y = b[i]
        val wx = weight(x)
        val wy = weight(y)
        if (wx != wy) return wx.compareTo(wy)
        val c = x.lowercaseChar().compareTo(y.lowercaseChar())
        if (c != 0) return c.coerceIn(-1, 1)
    }
    if (a.length != b.length) return a.length.compareTo(b.length)
    for (i in 0 until n) {
        if (a[i] != b[i]) return if (a[i].isLowerCase()) -1 else 1
    }
    return 0
}
