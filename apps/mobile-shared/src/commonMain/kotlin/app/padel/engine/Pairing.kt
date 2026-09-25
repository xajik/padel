package app.padel.engine

/* ------------------------------------------------------------------ */
/* History                                                              */
/* ------------------------------------------------------------------ */

class History(
    val partners: MutableMap<String, Int> = linkedMapOf(),
    val opponents: MutableMap<String, Int> = linkedMapOf(),
    val byes: MutableMap<String, Int> = linkedMapOf(),
    var lastByes: Set<String> = emptySet(),
)

private fun key(a: String, b: String) = if (a < b) "$a|$b" else "$b|$a"
private fun MutableMap<String, Int>.bump(k: String) {
    this[k] = (this[k] ?: 0) + 1
}

/** Partner / opponent / bye counts over the given rounds, keyed by unit (player or team). */
fun buildHistory(rounds: List<Round>, unitOf: (String) -> String): History {
    val h = History()
    for (r in rounds) {
        for (m in r.matches) {
            val a = m.teamA.map(unitOf)
            val b = m.teamB.map(unitOf)
            if (a[0] != a[1]) h.partners.bump(key(a[0], a[1]))
            if (b[0] != b[1]) h.partners.bump(key(b[0], b[1]))
            for (x in a.distinct()) for (y in b.distinct()) h.opponents.bump(key(x, y))
        }
        for (u in r.byes.map(unitOf).distinct()) h.byes.bump(u)
    }
    rounds.lastOrNull()?.let { last -> h.lastByes = last.byes.map(unitOf).toSet() }
    return h
}

private fun partnerCost(h: History, a: String, b: String) = h.partners[key(a, b)] ?: 0
private fun opponentCost(h: History, a: List<String>, b: List<String>): Int {
    var c = 0
    for (x in a) for (y in b) c += h.opponents[key(x, y)] ?: 0
    return c
}

/* ------------------------------------------------------------------ */
/* Byes                                                                 */
/* ------------------------------------------------------------------ */

/** Fewest byes first, then those who didn't just sit out, then seeded random. */
fun pickByes(units: List<String>, count: Int, h: History, rng: Rng): List<String> {
    if (count <= 0) return emptyList()
    val order = shuffle(units, rng).sortedWith { a, b ->
        val d = (h.byes[a] ?: 0) - (h.byes[b] ?: 0)
        if (d != 0) d else (if (a in h.lastByes) 1 else 0) - (if (b in h.lastByes) 1 else 0)
    }
    return order.take(count)
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                      */
/* ------------------------------------------------------------------ */

/** Circle-method 1-factorisation: round r of n-1 for an even n. Returns index pairs. */
fun circlePairs(n: Int, r: Int): List<Pair<Int, Int>> {
    val m = n - 1
    val pairs = mutableListOf(Pair(r % m, m))
    var i = 1
    while (i * 2 < n) {
        pairs += Pair((r + i) % m, (r - i + m) % m)
        i++
    }
    return pairs
}

/** Two sides of a match, each a list of units. */
private typealias Sides = Pair<List<String>, List<String>>

private class Best(val matches: List<Sides>, val cost: Int)

/** Group pairs into matches, minimising repeated opponents. */
private fun matchPairs(pairs: List<List<String>>, h: History, rng: Rng, tries: Int): Best {
    var best: Best? = null
    for (t in 0 until tries) {
        val pool = shuffle(pairs, rng).toMutableList()
        val matches = mutableListOf<Sides>()
        var cost = 0
        while (pool.isNotEmpty()) {
            val p = pool.removeAt(0)
            var bi = 0
            var bc = Int.MAX_VALUE
            pool.forEachIndexed { i, q ->
                val c = opponentCost(h, p, q)
                if (c < bc) {
                    bc = c
                    bi = i
                }
            }
            matches += Pair(p, pool.removeAt(bi))
            cost += bc
        }
        if (best == null || cost < best.cost) best = Best(matches, cost)
        if (cost == 0) break
    }
    return best!!
}

/** Individual players → matches, minimising repeat partners (heavily) and opponents. */
private fun balancedIndividuals(active: List<String>, h: History, rng: Rng, tries: Int): List<Sides> {
    var best: Best? = null
    for (t in 0 until tries) {
        val pool = shuffle(active, rng).toMutableList()
        val pairs = mutableListOf<List<String>>()
        var pc = 0
        while (pool.isNotEmpty()) {
            val x = pool.removeAt(0)
            var bi = 0
            var bc = Int.MAX_VALUE
            pool.forEachIndexed { i, y ->
                val c = partnerCost(h, x, y)
                if (c < bc) {
                    bc = c
                    bi = i
                }
            }
            pairs += listOf(x, pool.removeAt(bi))
            pc += bc
        }
        val m = matchPairs(pairs, h, rng, 4)
        val cost = pc * 10 + m.cost * 3
        if (best == null || cost < best.cost) best = Best(m.matches, cost)
        if (cost == 0) break
    }
    return best!!.matches
}

private fun <T> chunk(items: List<T>, size: Int): List<List<T>> = items.chunked(size)

/* ------------------------------------------------------------------ */
/* Round generation                                                     */
/* ------------------------------------------------------------------ */

private class Ctx(
    val state: GameState,
    val index: Int,
    val previous: List<Round>,
    val rng: Rng,
    val units: List<String>,
    val unitOf: (String) -> String,
    val membersOf: (String) -> List<String>,
    val history: History,
)

private fun context(state: GameState, index: Int, seedSuffix: String = ""): Ctx {
    val info = modeInfo(state.settings.mode)
    val byPlayer = state.players.associateBy { it.id }
    val unitOf: (String) -> String = if (info.teams) { id -> byPlayer.getValue(id).teamId!! } else { id -> id }
    val membersOf: (String) -> List<String> =
        if (info.teams) { u -> state.players.filter { it.teamId == u }.map { it.id } } else { u -> listOf(u) }
    val previous = state.rounds.take(index)
    return Ctx(
        state = state,
        index = index,
        previous = previous,
        rng = createRng("${state.seed}:r$index$seedSuffix"),
        units = unitsOf(state.settings, state.players),
        unitOf = unitOf,
        membersOf = membersOf,
        history = buildHistory(previous, unitOf),
    )
}

private fun toRound(ctx: Ctx, matches: List<Sides>, byeUnits: List<String>): Round {
    fun expand(units: List<String>): Team {
        val ids = units.flatMap(ctx.membersOf)
        return listOf(ids[0], ids[1])
    }
    return Round(
        index = ctx.index,
        matches = matches.mapIndexed { i, (a, b) -> Match(i + 1, expand(a), expand(b), null, null) },
        byes = byeUnits.flatMap(ctx.membersOf),
    )
}

/** Units ordered by current standings (best first), using rounds before this one. */
private fun orderByStandings(ctx: Ctx, units: List<String>): List<String> {
    val table = computeStandings(ctx.state.copy(rounds = ctx.previous))
    val pos = table.withIndex().associate { (i, s) -> s.id to i }
    return units.sortedBy { pos[it] ?: 0 }
}

private fun slotsPerCourt(teams: Boolean) = if (teams) 2 else 4

private fun activeAndByes(ctx: Ctx): Pair<List<String>, List<String>> {
    val teams = modeInfo(ctx.state.settings.mode).teams
    val slots = ctx.state.settings.courts * slotsPerCourt(teams)
    val byes = pickByes(ctx.units, maxOf(0, ctx.units.size - slots), ctx.history, ctx.rng)
    val out = byes.toSet()
    return Pair(ctx.units.filter { it !in out }, byes)
}

private fun americano(ctx: Ctx): Round {
    val (active, byes) = activeAndByes(ctx)

    if (ctx.state.settings.shuffle == ShuffleMode.Random) {
        val order = shuffle(active, ctx.rng)
        return toRound(ctx, chunk(order, 4).map { g -> Sides(listOf(g[0], g[1]), listOf(g[2], g[3])) }, byes)
    }

    // Everyone plays: a perfect partner rotation exists for the first n-1 rounds.
    if (byes.isEmpty() && ctx.index < ctx.units.size - 1) {
        val perm = shuffle(ctx.units, createRng("${ctx.state.seed}:perm"))
        val pairs = circlePairs(perm.size, ctx.index).map { (a, b) -> listOf(perm[a], perm[b]) }
        return toRound(ctx, matchPairs(pairs, ctx.history, ctx.rng, 24).matches, byes)
    }
    return toRound(ctx, balancedIndividuals(active, ctx.history, ctx.rng, 60), byes)
}

private fun teamAmericano(ctx: Ctx): Round {
    val (active, byes) = activeAndByes(ctx)
    if (ctx.state.settings.shuffle == ShuffleMode.Random) {
        val order = shuffle(active, ctx.rng)
        return toRound(ctx, chunk(order, 2).map { g -> Sides(listOf(g[0]), listOf(g[1])) }, byes)
    }
    if (byes.isEmpty() && ctx.index < ctx.units.size - 1) {
        val perm = shuffle(ctx.units, createRng("${ctx.state.seed}:perm"))
        return toRound(ctx, circlePairs(perm.size, ctx.index).map { (a, b) -> Sides(listOf(perm[a]), listOf(perm[b])) }, byes)
    }
    val singles = active.map { listOf(it) }
    return toRound(ctx, matchPairs(singles, ctx.history, ctx.rng, 60).matches, byes)
}

private fun mexicano(ctx: Ctx): Round {
    val (active, byes) = activeAndByes(ctx)
    if (ctx.index == 0) return toRound(ctx, balancedIndividuals(active, ctx.history, ctx.rng, 20), byes)
    val ordered = orderByStandings(ctx, active)
    return toRound(ctx, chunk(ordered, 4).map { g -> Sides(listOf(g[0], g[3]), listOf(g[1], g[2])) }, byes)
}

private fun teamMexicano(ctx: Ctx): Round {
    val (active, byes) = activeAndByes(ctx)
    val ordered = if (ctx.index == 0) shuffle(active, ctx.rng) else orderByStandings(ctx, active)
    return toRound(ctx, chunk(ordered, 2).map { g -> Sides(listOf(g[0]), listOf(g[1])) }, byes)
}

private fun mixicano(ctx: Ctx): Round {
    val players = ctx.state.players
    val sideA = players.filter { it.side == Side.A }.map { it.id }
    val sideB = players.filter { it.side == Side.B }.map { it.id }
    val perSide = ctx.state.settings.courts * 2
    val byesA = pickByes(sideA, sideA.size - perSide, ctx.history, ctx.rng)
    val byesB = pickByes(sideB, sideB.size - perSide, ctx.history, ctx.rng)
    val activeA = sideA.filter { it !in byesA }
    val activeB = sideB.filter { it !in byesB }
    val a = if (ctx.index == 0) shuffle(activeA, ctx.rng) else orderByStandings(ctx, activeA)
    val b = if (ctx.index == 0) shuffle(activeB, ctx.rng) else orderByStandings(ctx, activeB)
    val matches = (0 until ctx.state.settings.courts).map { c ->
        val a1 = a[c * 2]
        val a2 = a[c * 2 + 1]
        val b1 = b[c * 2]
        val b2 = b[c * 2 + 1]
        Sides(listOf(a1, b2), listOf(a2, b1))
    }
    return toRound(ctx, matches, byesA + byesB)
}

private val BOX_COMBOS = listOf(
    listOf(0, 1) to listOf(2, 3),
    listOf(0, 2) to listOf(1, 3),
    listOf(0, 3) to listOf(1, 2),
)

private fun boxOf(m: Match) = listOf(m.teamA[0], m.teamA[1], m.teamB[0], m.teamB[1])

private class BoxPoints(var pf: Int = 0, var diff: Int = 0)

/** Box membership for the cycle containing `index`. */
private fun boxesFor(ctx: Ctx): List<List<String>> {
    val cycle = ctx.index / 3
    if (cycle == 0) return chunk(shuffle(ctx.units, createRng("${ctx.state.seed}:boxes")), 4)
    val cycleStart = cycle * 3
    if (ctx.index > cycleStart) {
        // Mid-cycle: keep the boxes (and their order) from the cycle's first round.
        return ctx.previous[cycleStart].matches.map(::boxOf)
    }
    // New cycle: rank each box on the last cycle, then swap winners up / losers down.
    val last = ctx.previous.subList(cycleStart - 3, cycleStart)
    val boxes = last[0].matches.map(::boxOf)
    val ranked = boxes.map { box ->
        val pts = box.associateWith { BoxPoints() }
        for (r in last) {
            for (m in r.matches) {
                for ((team, pf, pa) in listOf(
                    Triple(m.teamA, m.scoreA ?: 0, m.scoreB ?: 0),
                    Triple(m.teamB, m.scoreB ?: 0, m.scoreA ?: 0),
                )) {
                    for (id in team) {
                        val e = pts[id] ?: continue
                        e.pf += pf
                        e.diff += pf - pa
                    }
                }
            }
        }
        shuffle(box, ctx.rng).sortedWith { a, b ->
            val d = pts.getValue(b).pf - pts.getValue(a).pf
            if (d != 0) d else pts.getValue(b).diff - pts.getValue(a).diff
        }
    }
    val next = ranked.map { it.toMutableList() }
    for (i in 0 until next.size - 1) {
        val loser = ranked[i][3]
        val winner = ranked[i + 1][0]
        next[i][next[i].indexOf(loser)] = winner
        next[i + 1][next[i + 1].indexOf(winner)] = loser
    }
    return next
}

private fun beatTheBox(ctx: Ctx): Round {
    val (sideA, sideB) = BOX_COMBOS[ctx.index % 3]
    val boxes = boxesFor(ctx)
    return toRound(ctx, boxes.map { b -> Sides(listOf(b[sideA[0]], b[sideA[1]]), listOf(b[sideB[0]], b[sideB[1]])) }, emptyList())
}

private class CourtResult(val winners: List<String>, val losers: List<String>)

/** Winner/loser unit groups of the previous round's matches, by court. */
private fun courtResults(ctx: Ctx): List<CourtResult> {
    val prev = ctx.previous[ctx.index - 1]
    return prev.matches.sortedBy { it.court }.map { m ->
        var o = matchOutcome(m)
        if (o == 0) o = if (ctx.rng.next() < 0.5) 1 else -1
        val a = m.teamA.map(ctx.unitOf).distinct()
        val b = m.teamB.map(ctx.unitOf).distinct()
        if (o == 1) CourtResult(a, b) else CourtResult(b, a)
    }
}

private fun upAndDown(ctx: Ctx): Round {
    val teams = modeInfo(ctx.state.settings.mode).teams
    val courts = ctx.state.settings.courts
    if (ctx.index == 0) {
        val order = shuffle(ctx.units, ctx.rng)
        val matches = if (teams) {
            chunk(order, 2).map { g -> Sides(listOf(g[0]), listOf(g[1])) }
        } else {
            chunk(order, 4).map { g -> Sides(listOf(g[0], g[3]), listOf(g[1], g[2])) }
        }
        return toRound(ctx, matches, emptyList())
    }
    val results = courtResults(ctx)
    val incoming = List(courts) { mutableListOf<List<String>>() }
    results.forEachIndexed { i, r ->
        incoming[maxOf(0, i - 1)] += r.winners
        incoming[minOf(courts - 1, i + 1)] += r.losers
    }
    val matches = incoming.map { groups ->
        val g1 = groups[0]
        val g2 = groups[1]
        if (teams) return@map Sides(g1, g2)
        // Split previous partners: one from each incoming pair per team.
        val x = shuffle(g1, ctx.rng)
        val y = shuffle(g2, ctx.rng)
        Sides(listOf(x[0], y[0]), listOf(x[1], y[1]))
    }
    return toRound(ctx, matches, emptyList())
}

/** Generate round `index` from the rounds before it. */
fun generateRound(state: GameState, index: Int, seedSuffix: String = ""): Round {
    val ctx = context(state, index, seedSuffix)
    return when (state.settings.mode) {
        ModeId.Americano -> americano(ctx)
        ModeId.TeamAmericano -> teamAmericano(ctx)
        ModeId.Mexicano -> mexicano(ctx)
        ModeId.TeamMexicano -> teamMexicano(ctx)
        ModeId.Mixicano -> mixicano(ctx)
        ModeId.BeatTheBox -> beatTheBox(ctx)
        ModeId.UpAndDown, ModeId.TeamUpAndDown -> upAndDown(ctx)
    }
}

/** Total repeat cost of a schedule (lower is fairer). */
fun scheduleCost(state: GameState, rounds: List<Round>): Int {
    val info = modeInfo(state.settings.mode)
    val byPlayer = state.players.associateBy { it.id }
    val unitOf: (String) -> String = if (info.teams) { id -> byPlayer.getValue(id).teamId!! } else { id -> id }
    val h = buildHistory(rounds, unitOf)
    var cost = 0
    for (c in h.partners.values) cost += (c - 1) * 10
    for (c in h.opponents.values) cost += maxOf(0, c - 1) * 3
    val byes = unitsOf(state.settings, state.players).map { h.byes[it] ?: 0 }
    cost += (byes.max() - byes.min()) * 50
    return cost
}

/** Pre-generate a full schedule for result-independent modes, keeping the fairest of several attempts. */
fun generateSchedule(state: GameState, count: Int, attempts: Int = 16): List<Round> {
    var best: Pair<List<Round>, Int>? = null
    for (a in 0 until attempts) {
        val rounds = mutableListOf<Round>()
        for (i in 0 until count) {
            rounds += generateRound(state.copy(rounds = rounds.toList()), i, if (a == 0) "" else ":a$a")
        }
        val cost = scheduleCost(state, rounds)
        if (best == null || cost < best.second) best = Pair(rounds, cost)
        if (cost == 0 || state.settings.shuffle == ShuffleMode.Random) break
    }
    return best!!.first
}
