import { createRng, shuffle, type Rng } from './rng';
import { modeInfo, unitsOf } from './modes';
import { computeStandings, matchOutcome } from './standings';
import type { GameState, Match, Round, Team } from './types';

/* ------------------------------------------------------------------ */
/* History                                                              */
/* ------------------------------------------------------------------ */

export interface History {
  partners: Map<string, number>;
  opponents: Map<string, number>;
  byes: Map<string, number>;
  lastByes: Set<string>;
}

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

/** Partner / opponent / bye counts over the given rounds, keyed by unit (player or team). */
export function buildHistory(rounds: Round[], unitOf: (playerId: string) => string): History {
  const h: History = { partners: new Map(), opponents: new Map(), byes: new Map(), lastByes: new Set() };
  for (const r of rounds) {
    for (const m of r.matches) {
      const a = m.teamA.map(unitOf);
      const b = m.teamB.map(unitOf);
      if (a[0] !== a[1]) bump(h.partners, key(a[0], a[1]));
      if (b[0] !== b[1]) bump(h.partners, key(b[0], b[1]));
      for (const x of new Set(a)) for (const y of new Set(b)) bump(h.opponents, key(x, y));
    }
    const byeUnits = new Set(r.byes.map(unitOf));
    for (const u of byeUnits) bump(h.byes, u);
  }
  const last = rounds[rounds.length - 1];
  if (last) h.lastByes = new Set(last.byes.map(unitOf));
  return h;
}

const partnerCost = (h: History, a: string, b: string) => h.partners.get(key(a, b)) ?? 0;
const opponentCost = (h: History, a: string[], b: string[]) => {
  let c = 0;
  for (const x of a) for (const y of b) c += h.opponents.get(key(x, y)) ?? 0;
  return c;
};

/* ------------------------------------------------------------------ */
/* Byes                                                                 */
/* ------------------------------------------------------------------ */

/** Fewest byes first, then those who didn't just sit out, then seeded random. */
export function pickByes(units: string[], count: number, h: History, rng: Rng): string[] {
  if (count <= 0) return [];
  const order = shuffle(units, rng);
  order.sort((a, b) => {
    const d = (h.byes.get(a) ?? 0) - (h.byes.get(b) ?? 0);
    if (d !== 0) return d;
    return Number(h.lastByes.has(a)) - Number(h.lastByes.has(b));
  });
  return order.slice(0, count);
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                      */
/* ------------------------------------------------------------------ */

/** Circle-method 1-factorisation: round r of n-1 for an even n. Returns index pairs. */
export function circlePairs(n: number, r: number): [number, number][] {
  const m = n - 1;
  const pairs: [number, number][] = [[r % m, m]];
  for (let i = 1; i < n / 2; i++) pairs.push([(r + i) % m, (r - i + m) % m]);
  return pairs;
}

/** Group pairs into matches, minimising repeated opponents. */
function matchPairs(pairs: string[][], h: History, rng: Rng, tries: number): { matches: [string[], string[]][]; cost: number } {
  let best: { matches: [string[], string[]][]; cost: number } | null = null;
  for (let t = 0; t < tries; t++) {
    const pool = shuffle(pairs, rng);
    const matches: [string[], string[]][] = [];
    let cost = 0;
    while (pool.length) {
      const p = pool.shift()!;
      let bi = 0;
      let bc = Infinity;
      pool.forEach((q, i) => {
        const c = opponentCost(h, p, q);
        if (c < bc) {
          bc = c;
          bi = i;
        }
      });
      const q = pool.splice(bi, 1)[0];
      matches.push([p, q]);
      cost += bc;
    }
    if (!best || cost < best.cost) best = { matches, cost };
    if (cost === 0) break;
  }
  return best!;
}

/** Individual players → matches, minimising repeat partners (heavily) and opponents. */
function balancedIndividuals(active: string[], h: History, rng: Rng, tries: number): [string[], string[]][] {
  let best: { matches: [string[], string[]][]; cost: number } | null = null;
  for (let t = 0; t < tries; t++) {
    const pool = shuffle(active, rng);
    const pairs: string[][] = [];
    let pc = 0;
    while (pool.length) {
      const x = pool.shift()!;
      let bi = 0;
      let bc = Infinity;
      pool.forEach((y, i) => {
        const c = partnerCost(h, x, y);
        if (c < bc) {
          bc = c;
          bi = i;
        }
      });
      pairs.push([x, pool.splice(bi, 1)[0]]);
      pc += bc;
    }
    const m = matchPairs(pairs, h, rng, 4);
    const cost = pc * 10 + m.cost * 3;
    if (!best || cost < best.cost) best = { matches: m.matches, cost };
    if (cost === 0) break;
  }
  return best!.matches;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/* ------------------------------------------------------------------ */
/* Round generation                                                     */
/* ------------------------------------------------------------------ */

interface Ctx {
  state: GameState;
  index: number;
  previous: Round[];
  rng: Rng;
  units: string[];
  unitOf: (id: string) => string;
  membersOf: (unit: string) => string[];
  history: History;
}

function context(state: GameState, index: number, seedSuffix = ''): Ctx {
  const info = modeInfo(state.settings.mode);
  const byPlayer = new Map(state.players.map((p) => [p.id, p]));
  const unitOf = info.teams ? (id: string) => byPlayer.get(id)!.teamId! : (id: string) => id;
  const membersOf = info.teams
    ? (u: string) => state.players.filter((p) => p.teamId === u).map((p) => p.id)
    : (u: string) => [u];
  const previous = state.rounds.slice(0, index);
  return {
    state,
    index,
    previous,
    rng: createRng(`${state.seed}:r${index}${seedSuffix}`),
    units: unitsOf(state.settings, state.players),
    unitOf,
    membersOf,
    history: buildHistory(previous, unitOf),
  };
}

function toRound(ctx: Ctx, matches: [string[], string[]][], byeUnits: string[]): Round {
  const expand = (units: string[]): Team => {
    const ids = units.flatMap(ctx.membersOf);
    return [ids[0], ids[1]];
  };
  return {
    index: ctx.index,
    matches: matches.map(([a, b], i): Match => ({
      court: i + 1,
      teamA: expand(a),
      teamB: expand(b),
      scoreA: null,
      scoreB: null,
    })),
    byes: byeUnits.flatMap(ctx.membersOf),
  };
}

/** Units ordered by current standings (best first), using rounds before this one. */
function orderByStandings(ctx: Ctx, units: string[]): string[] {
  const table = computeStandings({ ...ctx.state, rounds: ctx.previous });
  const pos = new Map(table.map((s, i) => [s.id, i]));
  return units.slice().sort((a, b) => (pos.get(a) ?? 0) - (pos.get(b) ?? 0));
}

function slotsPerCourt(teams: boolean) {
  return teams ? 2 : 4;
}

function activeAndByes(ctx: Ctx): { active: string[]; byes: string[] } {
  const teams = modeInfo(ctx.state.settings.mode).teams;
  const slots = ctx.state.settings.courts * slotsPerCourt(teams);
  const byes = pickByes(ctx.units, Math.max(0, ctx.units.length - slots), ctx.history, ctx.rng);
  const out = new Set(byes);
  return { active: ctx.units.filter((u) => !out.has(u)), byes };
}

function americano(ctx: Ctx): Round {
  const { active, byes } = activeAndByes(ctx);
  const { shuffle: mode } = ctx.state.settings;

  if (mode === 'random') {
    const order = shuffle(active, ctx.rng);
    return toRound(ctx, chunk(order, 4).map((g) => [[g[0], g[1]], [g[2], g[3]]]), byes);
  }

  // Everyone plays: a perfect partner rotation exists for the first n-1 rounds.
  if (byes.length === 0 && ctx.index < ctx.units.length - 1) {
    const perm = shuffle(ctx.units, createRng(`${ctx.state.seed}:perm`));
    const pairs = circlePairs(perm.length, ctx.index).map(([a, b]) => [perm[a], perm[b]]);
    return toRound(ctx, matchPairs(pairs, ctx.history, ctx.rng, 24).matches, byes);
  }
  return toRound(ctx, balancedIndividuals(active, ctx.history, ctx.rng, 60), byes);
}

function teamAmericano(ctx: Ctx): Round {
  const { active, byes } = activeAndByes(ctx);
  if (ctx.state.settings.shuffle === 'random') {
    const order = shuffle(active, ctx.rng);
    return toRound(ctx, chunk(order, 2).map((g) => [[g[0]], [g[1]]]), byes);
  }
  if (byes.length === 0 && ctx.index < ctx.units.length - 1) {
    const perm = shuffle(ctx.units, createRng(`${ctx.state.seed}:perm`));
    return toRound(
      ctx,
      circlePairs(perm.length, ctx.index).map(([a, b]) => [[perm[a]], [perm[b]]]),
      byes,
    );
  }
  const singles = active.map((u) => [u]);
  return toRound(ctx, matchPairs(singles, ctx.history, ctx.rng, 60).matches, byes);
}

function mexicano(ctx: Ctx): Round {
  const { active, byes } = activeAndByes(ctx);
  if (ctx.index === 0) return toRound(ctx, balancedIndividuals(active, ctx.history, ctx.rng, 20), byes);
  const ordered = orderByStandings(ctx, active);
  return toRound(
    ctx,
    chunk(ordered, 4).map((g) => [[g[0], g[3]], [g[1], g[2]]]),
    byes,
  );
}

function teamMexicano(ctx: Ctx): Round {
  const { active, byes } = activeAndByes(ctx);
  const ordered = ctx.index === 0 ? shuffle(active, ctx.rng) : orderByStandings(ctx, active);
  return toRound(ctx, chunk(ordered, 2).map((g) => [[g[0]], [g[1]]]), byes);
}

function mixicano(ctx: Ctx): Round {
  const players = ctx.state.players;
  const sideA = players.filter((p) => p.side === 'A').map((p) => p.id);
  const sideB = players.filter((p) => p.side === 'B').map((p) => p.id);
  const perSide = ctx.state.settings.courts * 2;
  const byesA = pickByes(sideA, sideA.length - perSide, ctx.history, ctx.rng);
  const byesB = pickByes(sideB, sideB.length - perSide, ctx.history, ctx.rng);
  const activeA = sideA.filter((id) => !byesA.includes(id));
  const activeB = sideB.filter((id) => !byesB.includes(id));
  const a = ctx.index === 0 ? shuffle(activeA, ctx.rng) : orderByStandings(ctx, activeA);
  const b = ctx.index === 0 ? shuffle(activeB, ctx.rng) : orderByStandings(ctx, activeB);
  const matches: [string[], string[]][] = [];
  for (let c = 0; c < ctx.state.settings.courts; c++) {
    const [a1, a2] = [a[c * 2], a[c * 2 + 1]];
    const [b1, b2] = [b[c * 2], b[c * 2 + 1]];
    matches.push([[a1, b2], [a2, b1]]);
  }
  return toRound(ctx, matches, [...byesA, ...byesB]);
}

const BOX_COMBOS: [[number, number], [number, number]][] = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]],
];

/** Box membership for the cycle containing `index`. */
function boxesFor(ctx: Ctx): string[][] {
  const cycle = Math.floor(ctx.index / 3);
  if (cycle === 0) return chunk(shuffle(ctx.units, createRng(`${ctx.state.seed}:boxes`)), 4);
  const cycleStart = cycle * 3;
  if (ctx.index > cycleStart) {
    // Mid-cycle: keep the boxes (and their order) from the cycle's first round.
    return ctx.previous[cycleStart].matches.map((m) => [m.teamA[0], m.teamA[1], m.teamB[0], m.teamB[1]]);
  }
  // New cycle: rank each box on the last cycle, then swap winners up / losers down.
  const last = ctx.previous.slice(cycleStart - 3, cycleStart);
  const boxes = last[0].matches.map((m) => [m.teamA[0], m.teamA[1], m.teamB[0], m.teamB[1]]);
  const ranked = boxes.map((box) => {
    const pts = new Map(box.map((id) => [id, { pf: 0, diff: 0 }]));
    for (const r of last) {
      for (const m of r.matches) {
        for (const [team, pf, pa] of [
          [m.teamA, m.scoreA ?? 0, m.scoreB ?? 0],
          [m.teamB, m.scoreB ?? 0, m.scoreA ?? 0],
        ] as const) {
          for (const id of team) {
            const e = pts.get(id);
            if (e) {
              e.pf += pf;
              e.diff += pf - pa;
            }
          }
        }
      }
    }
    const tie = shuffle(box, ctx.rng);
    return tie.sort((a, b) => pts.get(b)!.pf - pts.get(a)!.pf || pts.get(b)!.diff - pts.get(a)!.diff);
  });
  const next = ranked.map((b) => b.slice());
  for (let i = 0; i < next.length - 1; i++) {
    const loser = ranked[i][3];
    const winner = ranked[i + 1][0];
    next[i][next[i].indexOf(loser)] = winner;
    next[i + 1][next[i + 1].indexOf(winner)] = loser;
  }
  return next;
}

function beatTheBox(ctx: Ctx): Round {
  const combo = BOX_COMBOS[ctx.index % 3];
  const boxes = boxesFor(ctx);
  return toRound(
    ctx,
    boxes.map((b) => [[b[combo[0][0]], b[combo[0][1]]], [b[combo[1][0]], b[combo[1][1]]]]),
    [],
  );
}

/** Winner/loser unit groups of the previous round's matches, by court. */
function courtResults(ctx: Ctx): { winners: string[]; losers: string[] }[] {
  const prev = ctx.previous[ctx.index - 1];
  return prev.matches
    .slice()
    .sort((a, b) => a.court - b.court)
    .map((m) => {
      let o = matchOutcome(m);
      if (o === 0) o = ctx.rng() < 0.5 ? 1 : -1;
      const a = [...new Set(m.teamA.map(ctx.unitOf))];
      const b = [...new Set(m.teamB.map(ctx.unitOf))];
      return o === 1 ? { winners: a, losers: b } : { winners: b, losers: a };
    });
}

function upAndDown(ctx: Ctx): Round {
  const teams = modeInfo(ctx.state.settings.mode).teams;
  const courts = ctx.state.settings.courts;
  if (ctx.index === 0) {
    const order = shuffle(ctx.units, ctx.rng);
    const matches = teams
      ? chunk(order, 2).map((g) => [[g[0]], [g[1]]] as [string[], string[]])
      : chunk(order, 4).map((g) => [[g[0], g[3]], [g[1], g[2]]] as [string[], string[]]);
    return toRound(ctx, matches, []);
  }
  const results = courtResults(ctx);
  const incoming: string[][][] = Array.from({ length: courts }, () => []);
  results.forEach((r, i) => {
    incoming[Math.max(0, i - 1)].push(r.winners);
    incoming[Math.min(courts - 1, i + 1)].push(r.losers);
  });
  const matches = incoming.map(([g1, g2]): [string[], string[]] => {
    if (teams) return [g1, g2];
    // Split previous partners: one from each incoming pair per team.
    const [x1, x2] = shuffle(g1, ctx.rng);
    const [y1, y2] = shuffle(g2, ctx.rng);
    return [[x1, y1], [x2, y2]];
  });
  return toRound(ctx, matches, []);
}

/** Generate round `index` from the rounds before it. */
export function generateRound(state: GameState, index: number, seedSuffix = ''): Round {
  const ctx = context(state, index, seedSuffix);
  switch (state.settings.mode) {
    case 'americano':
      return americano(ctx);
    case 'team-americano':
      return teamAmericano(ctx);
    case 'mexicano':
      return mexicano(ctx);
    case 'team-mexicano':
      return teamMexicano(ctx);
    case 'mixicano':
      return mixicano(ctx);
    case 'beat-the-box':
      return beatTheBox(ctx);
    case 'up-and-down':
    case 'team-up-and-down':
      return upAndDown(ctx);
  }
}

/** Total repeat cost of a schedule (lower is fairer). */
export function scheduleCost(state: GameState, rounds: Round[]): number {
  const info = modeInfo(state.settings.mode);
  const byPlayer = new Map(state.players.map((p) => [p.id, p]));
  const unitOf = info.teams ? (id: string) => byPlayer.get(id)!.teamId! : (id: string) => id;
  const h = buildHistory(rounds, unitOf);
  let cost = 0;
  for (const c of h.partners.values()) cost += (c - 1) * 10;
  for (const c of h.opponents.values()) cost += Math.max(0, c - 1) * 3;
  const byes = unitsOf(state.settings, state.players).map((u) => h.byes.get(u) ?? 0);
  cost += (Math.max(...byes) - Math.min(...byes)) * 50;
  return cost;
}

/** Pre-generate a full schedule for result-independent modes, keeping the fairest of several attempts. */
export function generateSchedule(state: GameState, count: number, attempts = 16): Round[] {
  let best: { rounds: Round[]; cost: number } | null = null;
  for (let a = 0; a < attempts; a++) {
    const rounds: Round[] = [];
    for (let i = 0; i < count; i++) {
      rounds.push(generateRound({ ...state, rounds }, i, a === 0 ? '' : `:a${a}`));
    }
    const cost = scheduleCost(state, rounds);
    if (!best || cost < best.cost) best = { rounds, cost };
    if (cost === 0 || state.settings.shuffle === 'random') break;
  }
  return best!.rounds;
}
