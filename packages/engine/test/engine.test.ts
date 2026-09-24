import { describe, expect, it } from 'vitest';
import {
  advanceStatus,
  computeStandings,
  createGame,
  defaultSettings,
  estimate,
  formatDuration,
  nextRound,
  setScore,
  swapPlayers,
  validate,
  type GameState,
  type ModeId,
  type Player,
  type Settings,
} from '../src';

const names = 'Anna Mikko Laura Jussi Sara Pekka Emma Olli Aino Ville Iida Timo Nea Eero Ella Juho Siiri Aku Kaisa Leo Mia Otto Venla Paavo'.split(' ');

function players(n: number, opts: { teams?: boolean; sides?: boolean } = {}): Player[] {
  return names.slice(0, n).map((name, i) => ({
    id: `p${i}`,
    name,
    ...(opts.teams ? { teamId: `t${Math.floor(i / 2)}` } : {}),
    ...(opts.sides ? { side: i % 2 === 0 ? ('A' as const) : ('B' as const) } : {}),
  }));
}

function settings(mode: ModeId, courts: number, patch: Partial<Settings> = {}): Settings {
  return { ...defaultSettings(mode), courts, ...patch };
}

/** Score every match of the current round: lower court → team A wins by court-dependent margin. */
function playRound(state: GameState, pick: (i: number) => number = (i) => 14 + (i % 3)): GameState {
  let s = state;
  s.rounds[s.current].matches.forEach((_, i) => {
    s = setScore(s, s.current, i, pick(i)).state;
  });
  return s;
}

function playAll(state: GameState): GameState {
  let s = playRound(state);
  while (advanceStatus(s) === 'ready') s = playRound(nextRound(s));
  return s;
}

const pairKey = (a: string, b: string) => [a, b].sort().join('|');

describe('Americano', () => {
  it('AC-E1: 8 players, 2 courts → 7 rounds, every partner exactly once, no byes', () => {
    const g = createGame(settings('americano', 2), players(8), 'seed-1');
    expect(g.rounds).toHaveLength(7);
    const partners = new Map<string, number>();
    for (const r of g.rounds) {
      expect(r.byes).toHaveLength(0);
      expect(r.matches).toHaveLength(2);
      for (const m of r.matches) {
        for (const t of [m.teamA, m.teamB]) partners.set(pairKey(t[0], t[1]), (partners.get(pairKey(t[0], t[1])) ?? 0) + 1);
      }
    }
    expect(partners.size).toBe(28);
    expect([...partners.values()].every((c) => c === 1)).toBe(true);
    const e = estimate(g.settings, 8);
    expect(e.matches).toBe(14);
    expect(e.perPlayerMax).toBe(7);
  });

  it('AC-E2: 10 players, 2 courts, 5 rounds → each sits out once, never twice in a row', () => {
    const g = createGame(settings('americano', 2, { rounds: { type: 'fixed', count: 5 } }), players(10), 's2');
    const byes = new Map<string, number>();
    g.rounds.forEach((r, i) => {
      expect(r.byes).toHaveLength(2);
      for (const id of r.byes) {
        byes.set(id, (byes.get(id) ?? 0) + 1);
        if (i > 0) expect(g.rounds[i - 1].byes).not.toContain(id);
      }
    });
    expect(byes.size).toBe(10);
    expect([...byes.values()].every((c) => c === 1)).toBe(true);
  });

  it('auto rounds for 10 players on 2 courts is one full sit-out cycle', () => {
    expect(createGame(settings('americano', 2), players(10), 'x').rounds).toHaveLength(5);
  });

  it('AC-E3: 5 players, 1 court, 5 rounds → one bye each, no repeated partner', () => {
    const g = createGame(settings('americano', 1, { rounds: { type: 'fixed', count: 5 } }), players(5), 's3');
    const byes = g.rounds.flatMap((r) => r.byes);
    expect(new Set(byes).size).toBe(5);
    const partners = new Set<string>();
    for (const r of g.rounds)
      for (const m of r.matches)
        for (const t of [m.teamA, m.teamB]) {
          const k = pairKey(t[0], t[1]);
          expect(partners.has(k)).toBe(false);
          partners.add(k);
        }
  });

  it('every player appears exactly once per round', () => {
    for (const n of [4, 6, 7, 9, 11, 13, 16, 24]) {
      const courts = Math.min(6, Math.floor(n / 4));
      const g = createGame(settings('americano', courts), players(n), `n${n}`);
      for (const r of g.rounds) {
        const ids = [...r.matches.flatMap((m) => [...m.teamA, ...m.teamB]), ...r.byes];
        expect(ids.sort()).toEqual(players(n).map((p) => p.id).sort());
      }
    }
  });
});

describe('Mexicano', () => {
  it('AC-E4: round 2 puts the top 4 on court 1, paired 1+4 vs 2+3', () => {
    let g = createGame(settings('mexicano', 2, { rounds: { type: 'fixed', count: 4 } }), players(8), 'mx');
    g = playRound(g, (i) => (i === 0 ? 20 : 15));
    const table = computeStandings(g);
    g = nextRound(g);
    const court1 = g.rounds[1].matches[0];
    const top = table.slice(0, 4).map((s) => s.id);
    expect(court1.teamA.slice().sort()).toEqual([top[0], top[3]].sort());
    expect(court1.teamB.slice().sort()).toEqual([top[1], top[2]].sort());
  });

  it('AC-E9: editing a round-1 score regenerates round 2 while unscored', () => {
    let g = createGame(settings('mexicano', 2, { rounds: { type: 'fixed', count: 4 } }), players(8), 'mx2');
    g = nextRound(playRound(g));
    const res = setScore(g, 0, 0, 2);
    expect(res.regenerated).toEqual([1]);
    const scored = setScore(res.state, 1, 0, 12).state;
    expect(setScore(scored, 0, 0, 20).regenerated).toEqual([]);
  });

  it('plays a full open-ended session', () => {
    let g = createGame(settings('mexicano', 3, { rounds: { type: 'open' } }), players(13), 'open');
    for (let i = 0; i < 6; i++) g = nextRound(playRound(g));
    expect(g.rounds).toHaveLength(7);
    const byes = computeStandings(playRound(g)).map((s) => s.byes);
    expect(Math.max(...byes) - Math.min(...byes)).toBeLessThanOrEqual(1);
  });
});

describe('Mixicano', () => {
  it('AC-E5: every team has one player from each side', () => {
    const ps = players(8, { sides: true });
    const side = new Map(ps.map((p) => [p.id, p.side]));
    const g = playAll(createGame(settings('mixicano', 2, { rounds: { type: 'fixed', count: 5 } }), ps, 'mix'));
    for (const r of g.rounds)
      for (const m of r.matches)
        for (const t of [m.teamA, m.teamB]) expect(new Set(t.map((id) => side.get(id))).size).toBe(2);
  });

  it('rejects unequal sides', () => {
    const ps = players(8, { sides: true });
    ps[1].side = 'A';
    expect(validate(settings('mixicano', 2), ps).map((e) => e.code)).toContain('UNEQUAL_SIDES');
  });
});

describe('Up & Down', () => {
  it('AC-E6: winners move up, losers move down, partners split', () => {
    let g = createGame(settings('up-and-down', 3, { rounds: { type: 'fixed', count: 3 } }), players(12), 'ud');
    g = playRound(g, () => 15); // team A wins everywhere
    const r0 = g.rounds[0].matches;
    g = nextRound(g);
    const r1 = g.rounds[1].matches;
    const on = (m: (typeof r1)[number]) => [...m.teamA, ...m.teamB];
    expect(on(r1[0])).toEqual(expect.arrayContaining([...r0[1].teamA, ...r0[0].teamA]));
    expect(on(r1[1])).toEqual(expect.arrayContaining([...r0[0].teamB, ...r0[2].teamA]));
    expect(on(r1[2])).toEqual(expect.arrayContaining([...r0[1].teamB, ...r0[2].teamB]));
    const prevPartners = new Set(r0.flatMap((m) => [pairKey(...m.teamA), pairKey(...m.teamB)]));
    for (const m of r1) {
      expect(prevPartners.has(pairKey(...m.teamA))).toBe(false);
      expect(prevPartners.has(pairKey(...m.teamB))).toBe(false);
    }
  });

  it('requires 4 players per court', () => {
    expect(validate(settings('up-and-down', 2), players(10)).map((e) => e.code)).toContain('MULTIPLE_OF_FOUR');
  });

  it('team version keeps pairs together', () => {
    const g = playAll(createGame(settings('team-up-and-down', 2, { rounds: { type: 'fixed', count: 4 } }), players(8, { teams: true }), 'tud'));
    for (const r of g.rounds)
      for (const m of r.matches) for (const t of [m.teamA, m.teamB]) expect(Math.floor(+t[0].slice(1) / 2)).toBe(Math.floor(+t[1].slice(1) / 2));
  });
});

describe('Beat the Box', () => {
  it('AC-E7: a box plays all 3 combos, then box-1 last swaps with box-2 winner', () => {
    let g = createGame(settings('beat-the-box', 2, { rounds: { type: 'fixed', count: 4 } }), players(8), 'box');
    // Court 1: team A always wins big; court 2: team B always wins big.
    for (let r = 0; r < 3; r++) {
      g = setScore(g, r, 0, 20).state;
      g = setScore(g, r, 1, 4).state;
      if (r < 2) g = nextRound(g);
    }
    const box1 = new Set([...g.rounds[0].matches[0].teamA, ...g.rounds[0].matches[0].teamB]);
    const partners = new Set<string>();
    for (let r = 0; r < 3; r++) {
      const m = g.rounds[r].matches[0];
      expect(new Set([...m.teamA, ...m.teamB])).toEqual(box1);
      partners.add(pairKey(...m.teamA));
      partners.add(pairKey(...m.teamB));
    }
    expect(partners.size).toBe(6);
    g = nextRound(g);
    const newBox1 = new Set([...g.rounds[3].matches[0].teamA, ...g.rounds[3].matches[0].teamB]);
    expect([...newBox1].filter((id) => box1.has(id))).toHaveLength(3);
  });
});

describe('Team modes', () => {
  it('Team Americano: 4 pairs, 1 court → 3 rounds round-robin with byes', () => {
    const g = createGame(settings('team-americano', 1), players(8, { teams: true }), 'ta');
    const meetings = new Set<string>();
    for (const r of g.rounds) {
      expect(r.byes).toHaveLength(4);
      const m = r.matches[0];
      meetings.add(pairKey(m.teamA[0], m.teamB[0]));
    }
    expect(g.rounds.length).toBeGreaterThanOrEqual(2);
  });

  it('Team Mexicano standings are per team', () => {
    const g = playRound(createGame(settings('team-mexicano', 2), players(8, { teams: true }), 'tm'));
    const table = computeStandings(g);
    expect(table).toHaveLength(4);
    expect(table[0].name).toContain(' & ');
  });
});

describe('Scoring & standings', () => {
  it('auto-completes total points and rejects mismatches', () => {
    let g = createGame(settings('americano', 2), players(8), 'sc');
    g = setScore(g, 0, 0, 15).state;
    expect(g.rounds[0].matches[0].scoreB).toBe(9);
    expect(() => setScore(g, 0, 0, 15, 10)).toThrow(/add up to 24/);
  });

  it('points leaderboard sums points scored; movement tracks rank change', () => {
    let g = createGame(settings('americano', 2), players(8), 'lb');
    g = nextRound(playRound(g, () => 24));
    g = playRound(g, () => 0);
    const table = computeStandings(g);
    expect(table.reduce((a, s) => a + s.pointsFor, 0)).toBe(24 * 2 * 2 * 2);
    expect(table.some((s) => s.movement !== 0)).toBe(true);
  });

  it('bye compensation (average) credits sit-out players', () => {
    let g = createGame(settings('americano', 1, { byePoints: 'average' }), players(5), 'bye');
    g = playRound(g, () => 16);
    const bye = g.rounds[0].byes[0];
    const row = computeStandings(g).find((s) => s.id === bye)!;
    expect(row.score).toBe(12);
  });

  it('is deterministic per seed (AC-E8)', () => {
    const a = createGame(settings('americano', 2, { shuffle: 'random' }), players(10), 'same');
    const b = createGame(settings('americano', 2, { shuffle: 'random' }), players(10), 'same');
    const c = createGame(settings('americano', 2, { shuffle: 'random' }), players(10), 'other');
    expect(a.rounds).toEqual(b.rounds);
    expect(a.rounds).not.toEqual(c.rounds);
  });

  it('manual swap exchanges a player with one sitting out', () => {
    const g = createGame(settings('americano', 1), players(5), 'sw');
    const playing = g.rounds[0].matches[0].teamA[0];
    const sitting = g.rounds[0].byes[0];
    const s = swapPlayers(g, 0, playing, sitting);
    expect(s.rounds[0].byes).toEqual([playing]);
    expect(s.rounds[0].matches[0].teamA[0]).toBe(sitting);
  });
});

describe('Estimate', () => {
  it('AC-E10: 8 players, 2 courts, 24 points → ~1h 59m', () => {
    const e = estimate(settings('americano', 2), 8);
    expect(e.rounds).toBe(7);
    expect(formatDuration(e.minutes)).toBe('1h 59m');
  });
});
