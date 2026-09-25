/**
 * Golden fixtures shared with the Kotlin Multiplatform port (apps/mobile-shared).
 *
 * Each scenario is replayed here and compared with packages/engine/fixtures/*.json, so any
 * behaviour change in the TS engine fails until the fixtures are regenerated
 * (`npm run fixtures`), which in turn fails the Kotlin tests until the port matches.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  EngineError,
  MODES,
  advanceStatus,
  autoRounds,
  computeStandings,
  createGame,
  createRng,
  defaultSettings,
  estimate,
  formatDuration,
  nextRound,
  normalizeScore,
  setScore,
  shuffle,
  swapPlayers,
  validate,
  type GameState,
  type ModeId,
  type Player,
  type Scoring,
  type Settings,
} from '../src';

const DIR = new URL('../fixtures/', import.meta.url);
const UPDATE = process.env.UPDATE_FIXTURES === '1';

const NAMES = 'Anna Mikko Laura Jussi Sara Pekka Emma Olli Aino Ville Iida Timo Nea Eero Ella Juho Siiri Aku Kaisa Leo Mia Otto Venla Paavo'.split(' ');

function players(n: number, opts: { teams?: boolean; sides?: boolean } = {}): Player[] {
  return NAMES.slice(0, n).map((name, i) => ({
    id: `p${i}`,
    name,
    ...(opts.teams ? { teamId: `t${Math.floor(i / 2)}` } : {}),
    ...(opts.sides ? { side: i % 2 === 0 ? ('A' as const) : ('B' as const) } : {}),
  }));
}

/* ------------------------------------------------------------------ */
/* Game scenarios                                                       */
/* ------------------------------------------------------------------ */

type Step =
  | { op: 'score'; round: number; match: number; a: number | null; b: number | null; regenerated: number[] }
  | { op: 'next'; status: string }
  | { op: 'swap'; round: number; a: string; b: string };

interface GameCase {
  name: string;
  settings: Settings;
  players: Player[];
  seed: string;
  steps: Step[];
  expect: {
    initial: GameState;
    final: GameState;
    status: string;
    standings: ReturnType<typeof computeStandings>;
    /** standingsByRound[i] = computeStandings(final, i + 1). */
    standingsByRound: ReturnType<typeof computeStandings>[];
  };
}

/** Deterministic, varied score for a match (includes draws for even totals). */
function scoreFor(scoring: Scoring, round: number, match: number): [number, number | null] {
  const k = round * 7 + match * 5 + 3;
  switch (scoring.type) {
    case 'total': {
      const total = scoring.points ?? 24;
      return [k % (total + 1), null];
    }
    case 'first_to': {
      const target = scoring.points ?? 21;
      const loser = k % target;
      return k % 2 ? [target, loser] : [loser, target];
    }
    case 'timed':
      return [k % 9, (k * 3) % 8];
    case 'off':
      return [k % 3, (k + 1) % 3];
  }
}

function gameCase(name: string, settings: Settings, ps: Player[], seed: string, opts: { maxRounds?: number; swap?: boolean; rescore?: boolean } = {}): GameCase {
  const steps: Step[] = [];
  const initial = createGame(settings, ps, seed);
  let g = initial;
  const maxRounds = opts.maxRounds ?? 30;
  const teams = MODES.find((m) => m.id === settings.mode)!.teams;

  for (let played = 0; played < maxRounds; played++) {
    if (opts.swap && !teams && played === 1) {
      const r = g.rounds[g.current];
      const a = r.matches[0].teamA[0];
      const b = r.byes[0] ?? r.matches[r.matches.length - 1].teamB[1];
      g = swapPlayers(g, g.current, a, b);
      steps.push({ op: 'swap', round: g.current, a, b });
    }
    g.rounds[g.current].matches.forEach((_, i) => {
      const [a, b] = scoreFor(settings.scoring, g.current, i);
      const res = setScore(g, g.current, i, a, b);
      g = res.state;
      steps.push({ op: 'score', round: g.current, match: i, a, b, regenerated: res.regenerated });
    });
    const status = advanceStatus(g);
    if (status !== 'ready' || played === maxRounds - 1) break;
    g = nextRound(g);
    steps.push({ op: 'next', status });

    if (opts.rescore && played === 0) {
      // Edit a finished round while the next is unscored: dynamic modes regenerate it.
      const [a, b] = scoreFor(settings.scoring, 5, 3);
      const res = setScore(g, 0, 0, a, b);
      g = res.state;
      steps.push({ op: 'score', round: 0, match: 0, a, b, regenerated: res.regenerated });
    }
  }

  // Clearing a score, then entering it again.
  const last = g.current;
  g = setScore(g, last, 0, null).state;
  steps.push({ op: 'score', round: last, match: 0, a: null, b: null, regenerated: [] });
  const [a, b] = scoreFor(settings.scoring, last, 0);
  g = setScore(g, last, 0, a, b).state;
  steps.push({ op: 'score', round: last, match: 0, a, b, regenerated: [] });

  return {
    name,
    settings,
    players: ps,
    seed,
    steps,
    expect: {
      initial,
      final: g,
      status: advanceStatus(g),
      standings: computeStandings(g),
      standingsByRound: g.rounds.map((_, i) => computeStandings(g, i + 1)),
    },
  };
}

function s(mode: ModeId, courts: number, patch: Partial<Settings> = {}): Settings {
  return { ...defaultSettings(mode), courts, ...patch };
}

function gameCases(): GameCase[] {
  const cases: GameCase[] = [];
  const add = (name: string, settings: Settings, ps: Player[], opts: Parameters<typeof gameCase>[4] = {}) =>
    cases.push(gameCase(name, settings, ps, `fx-${name}`, opts));

  // Americano: full rotation, sit-outs, odd counts, shuffle modes, scoring types.
  add('americano-8p-2c', s('americano', 2), players(8), { swap: true });
  add('americano-4p-1c', s('americano', 1), players(4));
  add('americano-5p-1c', s('americano', 1), players(5));
  add('americano-7p-1c-avg-bye', s('americano', 1, { byePoints: 'average' }), players(7));
  add('americano-10p-2c', s('americano', 2), players(10), { swap: true });
  add('americano-13p-3c', s('americano', 3), players(13));
  add('americano-16p-4c', s('americano', 4), players(16));
  add('americano-24p-6c', s('americano', 6), players(24));
  add('americano-9p-2c-random', s('americano', 2, { shuffle: 'random' }), players(9));
  add('americano-8p-first-to', s('americano', 2, { scoring: { type: 'first_to', points: 11 } }), players(8));
  add('americano-8p-off-wins', s('americano', 2, { scoring: { type: 'off' } }), players(8));
  add('americano-8p-timed-avg', s('americano', 2, { scoring: { type: 'timed', minutes: 12 }, leaderboard: 'average' }), players(8));
  add('americano-11p-2c-fixed', s('americano', 2, { rounds: { type: 'fixed', count: 8 }, byePoints: 'average', leaderboard: 'average' }), players(11));
  add('americano-12p-2c-wins', s('americano', 2, { leaderboard: 'wins', scoring: { type: 'total', points: 16 } }), players(12));

  // Team Americano.
  add('team-americano-8p-2c', s('team-americano', 2), players(8, { teams: true }));
  add('team-americano-12p-2c', s('team-americano', 2), players(12, { teams: true }));
  add('team-americano-10p-1c-random', s('team-americano', 1, { shuffle: 'random' }), players(10, { teams: true }));

  // Mexicano (dynamic).
  add('mexicano-8p-2c', s('mexicano', 2), players(8), { rescore: true, swap: true });
  add('mexicano-9p-2c', s('mexicano', 2), players(9), { rescore: true });
  add('mexicano-13p-3c-open', s('mexicano', 3, { rounds: { type: 'open' } }), players(13), { maxRounds: 7 });
  add('mexicano-12p-3c-first-to', s('mexicano', 3, { scoring: { type: 'first_to', points: 15 } }), players(12));
  add('mexicano-10p-2c-avg', s('mexicano', 2, { byePoints: 'average', leaderboard: 'average' }), players(10));

  // Team Mexicano.
  add('team-mexicano-8p-2c', s('team-mexicano', 2), players(8, { teams: true }), { rescore: true });
  add('team-mexicano-14p-3c', s('team-mexicano', 3), players(14, { teams: true }));

  // Mixicano.
  add('mixicano-8p-2c', s('mixicano', 2, { rounds: { type: 'fixed', count: 5 } }), players(8, { sides: true }), { rescore: true });
  add('mixicano-12p-2c', s('mixicano', 2), players(12, { sides: true }));

  // Beat the Box.
  add('beat-the-box-8p-2c', s('beat-the-box', 2), players(8));
  add('beat-the-box-12p-3c-off', s('beat-the-box', 3, { scoring: { type: 'off' } }), players(12));
  add('beat-the-box-16p-4c-fixed', s('beat-the-box', 4, { rounds: { type: 'fixed', count: 9 } }), players(16));

  // Up & Down.
  add('up-and-down-12p-3c', s('up-and-down', 3), players(12), { rescore: true });
  add('up-and-down-8p-2c-timed', s('up-and-down', 2, { scoring: { type: 'timed' } }), players(8));
  add('team-up-and-down-12p-3c', s('team-up-and-down', 3), players(12, { teams: true }));
  add('team-up-and-down-8p-1c', s('team-up-and-down', 1, { rounds: { type: 'fixed', count: 4 } }), players(4, { teams: true }));

  return cases;
}

/* ------------------------------------------------------------------ */
/* Unit fixtures                                                        */
/* ------------------------------------------------------------------ */

function rngCases() {
  return ['', 'a', 'seed-1', 'fx-americano-8p-2c:r3', 'Ünïcødé 🎾', 'x'.repeat(100)].map((seed) => {
    const rng = createRng(seed);
    return {
      seed,
      values: Array.from({ length: 16 }, () => rng()),
      shuffle: shuffle(NAMES.slice(0, 12), createRng(`${seed}:shuffle`)),
    };
  });
}

function capture<T>(fn: () => T): { ok: T } | { error: string } {
  try {
    return { ok: fn() };
  } catch (e) {
    if (e instanceof EngineError) return { error: e.code };
    throw e;
  }
}

function scoreCases() {
  const scorings: Scoring[] = [
    { type: 'total', points: 24 },
    { type: 'total' },
    { type: 'first_to', points: 21 },
    { type: 'first_to' },
    { type: 'timed', minutes: 15 },
    { type: 'off' },
  ];
  const inputs: [number, number | null][] = [
    [0, null],
    [12, null],
    [24, null],
    [25, null],
    [10, 14],
    [10, 12],
    [21, 19],
    [21, 21],
    [22, 20],
    [3, 3],
    [-1, null],
    [1.5, null],
    [5, 2],
  ];
  return scorings.flatMap((scoring) => inputs.map(([a, b]) => ({ scoring, a, b, result: capture(() => normalizeScore(scoring, a, b)) })));
}

function validateCases() {
  const cases: { settings: Settings; players: Player[]; errors: ReturnType<typeof validate> }[] = [];
  const push = (settings: Settings, ps: Player[]) => cases.push({ settings, players: ps, errors: validate(settings, ps) });
  push(s('americano', 1), players(3));
  push(s('americano', 2), players(7));
  push(s('americano', 1), [...players(24), { id: 'p99', name: 'Extra' }]);
  push(s('americano', 1), [...players(4), { id: 'p0', name: 'Dup' }]);
  push(s('americano', 0), players(8));
  push(s('beat-the-box', 2), players(9));
  push(s('up-and-down', 1), players(4));
  push(s('team-americano', 2), players(8));
  push(s('team-americano', 1), players(6, { teams: true }).map((p, i) => (i === 5 ? { ...p, teamId: 't0' } : p)));
  push(s('mixicano', 2), players(8));
  push(s('mixicano', 2), players(8, { sides: true }).map((p, i) => (i === 1 ? { ...p, side: 'A' as const } : p)));
  push(s('americano', 2, { scoring: { type: 'total', points: 2 } }), players(8));
  push(s('americano', 2, { scoring: { type: 'first_to', points: 65 } }), players(8));
  push(s('americano', 2, { scoring: { type: 'first_to' } }), players(8));
  push(s('americano', 2, { scoring: { type: 'timed' } }), players(8));
  return cases;
}

function estimateCases() {
  const out: unknown[] = [];
  for (const { id: mode, teams } of MODES) {
    for (const n of [4, 5, 7, 8, 9, 10, 12, 13, 16, 20, 24]) {
      if (teams && n % 2) continue; // not a valid team game; the port assumes whole teams
      for (const courts of [1, 2, 3, 6]) {
        for (const rounds of [{ type: 'auto' }, { type: 'fixed', count: 7 }, { type: 'open' }] as const) {
          for (const scoring of [{ type: 'total', points: 24 }, { type: 'first_to', points: 21 }, { type: 'timed', minutes: 15 }, { type: 'off' }] as Scoring[]) {
            if (scoring.type !== 'total' && (courts !== 2 || rounds.type !== 'auto')) continue;
            const settings = s(mode, courts, { rounds, scoring });
            const e = estimate(settings, n);
            out.push({ settings, players: n, autoRounds: autoRounds(settings, n), estimate: e, duration: formatDuration(e.minutes) });
          }
        }
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */

const FILES: Record<string, () => unknown[]> = {
  'games.json': gameCases,
  'rng.json': rngCases,
  'score.json': scoreCases,
  'validate.json': validateCases,
  'estimate.json': estimateCases,
  'defaults.json': () => MODES.map((m) => ({ mode: m, defaults: [4, 8, 12, 24].map((n) => ({ players: n, settings: defaultSettings(m.id, n) })) })),
};

describe('shared fixtures', () => {
  if (UPDATE) mkdirSync(DIR, { recursive: true });
  for (const [file, build] of Object.entries(FILES)) {
    it(`${file} matches the engine`, () => {
      // One case per line: compact, but diffs stay readable.
      const json = '[\n' + (build() as unknown[]).map((c) => JSON.stringify(c)).join(',\n') + '\n]\n';
      const path = new URL(file, DIR);
      if (UPDATE) writeFileSync(path, json);
      expect(existsSync(path), `missing fixtures/${file}; run npm run fixtures`).toBe(true);
      expect(readFileSync(path, 'utf8') === json, `fixtures/${file} is stale; run npm run fixtures`).toBe(true);
    });
  }
});
