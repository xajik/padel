import { modeInfo } from './modes';
import type { GameState, LeaderboardMode, Match, Player, Round, Standing } from './types';

export function isScored(m: Match): boolean {
  return m.scoreA !== null && m.scoreB !== null;
}

export function isRoundComplete(r: Round): boolean {
  return r.matches.every(isScored);
}

/** 1 = team A won, -1 = team B won, 0 = draw. */
export function matchOutcome(m: Match): 1 | -1 | 0 {
  const a = m.scoreA ?? 0;
  const b = m.scoreB ?? 0;
  return a > b ? 1 : a < b ? -1 : 0;
}

interface Acc {
  id: string;
  name: string;
  playerIds: string[];
  played: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  byes: number;
}

function unitKey(state: GameState, playerId: string, byPlayer: Map<string, Player>): string {
  return modeInfo(state.settings.mode).teams ? byPlayer.get(playerId)!.teamId! : playerId;
}

export function teamName(players: Player[], ids: string[]): string {
  return ids.map((id) => players.find((p) => p.id === id)?.name ?? '?').join(' & ');
}

/**
 * Standings from every scored match in rounds with index < `uptoRound`
 * (all rounds by default). Byes count only for completed rounds.
 */
export function computeStandings(state: GameState, uptoRound = Infinity): Standing[] {
  const current = rank(state, accumulate(state, uptoRound));
  const completed = state.rounds.filter((r) => r.index < uptoRound && isRoundComplete(r));
  if (completed.length < 2) return current;

  const lastDone = completed[completed.length - 1].index;
  const previous = rank(state, accumulate(state, lastDone));
  const prevRank = new Map(previous.map((s) => [s.id, s.rank]));
  return current.map((s) => ({ ...s, movement: (prevRank.get(s.id) ?? s.rank) - s.rank }));
}

function accumulate(state: GameState, uptoRound: number): Map<string, Acc> {
  const byPlayer = new Map(state.players.map((p) => [p.id, p]));
  const acc = new Map<string, Acc>();
  const teams = modeInfo(state.settings.mode).teams;

  for (const p of state.players) {
    const key = unitKey(state, p.id, byPlayer);
    const entry = acc.get(key);
    if (entry) {
      entry.playerIds.push(p.id);
      continue;
    }
    acc.set(key, {
      id: key,
      name: p.name,
      playerIds: [p.id],
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      byes: 0,
    });
  }
  if (teams) for (const a of acc.values()) a.name = teamName(state.players, a.playerIds);

  for (const round of state.rounds) {
    if (round.index >= uptoRound) continue;
    for (const m of round.matches) {
      if (!isScored(m)) continue;
      const outcome = matchOutcome(m);
      credit(acc, teams ? [unitKey(state, m.teamA[0], byPlayer)] : m.teamA, m.scoreA!, m.scoreB!, outcome);
      credit(acc, teams ? [unitKey(state, m.teamB[0], byPlayer)] : m.teamB, m.scoreB!, m.scoreA!, -outcome as 1 | -1 | 0);
    }
    if (isRoundComplete(round)) {
      const byeUnits = new Set(round.byes.map((id) => unitKey(state, id, byPlayer)));
      for (const u of byeUnits) acc.get(u)!.byes += 1;
    }
  }
  return acc;
}

function credit(acc: Map<string, Acc>, ids: string[], pf: number, pa: number, outcome: 1 | -1 | 0) {
  for (const id of ids) {
    const a = acc.get(id)!;
    a.played += 1;
    a.pointsFor += pf;
    a.pointsAgainst += pa;
    if (outcome === 1) a.wins += 1;
    else if (outcome === -1) a.losses += 1;
    else a.draws += 1;
  }
}

function rank(state: GameState, acc: Map<string, Acc>): Standing[] {
  const { settings } = state;
  const mode: LeaderboardMode = settings.scoring.type === 'off' ? 'wins' : settings.leaderboard;
  const fallbackAvg = (settings.scoring.points ?? 0) / 2;

  const rows = [...acc.values()].map((a) => {
    const avg = a.played ? a.pointsFor / a.played : 0;
    const byeComp = settings.byePoints === 'average' ? a.byes * (a.played ? avg : fallbackAvg) : 0;
    const total = a.pointsFor + byeComp;
    const winScore = a.wins + a.draws / 2;
    const score =
      mode === 'points' ? round2(total) : mode === 'wins' ? winScore : round2(a.played ? total / (a.played + (byeComp ? a.byes : 0)) : 0);
    const diff = a.pointsFor - a.pointsAgainst;
    const keys =
      mode === 'points'
        ? [score, diff, a.wins]
        : mode === 'wins'
          ? [winScore, diff, a.pointsFor]
          : [score, a.played ? diff / a.played : 0, winScore];
    return { a, score, diff, keys };
  });

  rows.sort((x, y) => {
    for (let i = 0; i < x.keys.length; i++) {
      if (x.keys[i] !== y.keys[i]) return y.keys[i] - x.keys[i];
    }
    return x.a.name.localeCompare(y.a.name);
  });

  let lastKeys: number[] | null = null;
  let lastRank = 0;
  return rows.map((r, i) => {
    const same = lastKeys && lastKeys.every((k, j) => k === r.keys[j]);
    const rankValue = same ? lastRank : i + 1;
    lastKeys = r.keys;
    lastRank = rankValue;
    const { a } = r;
    return {
      id: a.id,
      name: a.name,
      playerIds: a.playerIds,
      rank: rankValue,
      played: a.played,
      wins: a.wins,
      draws: a.draws,
      losses: a.losses,
      pointsFor: a.pointsFor,
      pointsAgainst: a.pointsAgainst,
      diff: r.diff,
      byes: a.byes,
      score: r.score,
      movement: 0,
    };
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
