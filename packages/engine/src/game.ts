import { modeInfo, plannedRounds, unitsOf, validate } from './modes';
import { generateRound, generateSchedule } from './pairing';
import { randomSeed } from './rng';
import { isRoundComplete, isScored } from './standings';
import type { GameState, Player, Round, Scoring, Settings } from './types';

export class EngineError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function createGame(settings: Settings, players: Player[], seed: string = randomSeed()): GameState {
  const errors = validate(settings, players);
  if (errors.length) throw new EngineError(errors[0].code, errors[0].message);

  const planned = plannedRounds(settings, players.length);
  const base: GameState = { settings, players, seed, rounds: [], current: 0, plannedRounds: planned };
  const info = modeInfo(settings.mode);

  const rounds =
    !info.dynamic && planned !== null ? generateSchedule(base, planned) : [generateRound(base, 0)];
  return { ...base, rounds };
}

export type AdvanceStatus = 'ready' | 'incomplete' | 'finished';

export function advanceStatus(state: GameState): AdvanceStatus {
  const round = state.rounds[state.current];
  if (!round || !isRoundComplete(round)) return 'incomplete';
  if (state.plannedRounds !== null && state.current + 1 >= state.plannedRounds) return 'finished';
  return 'ready';
}

/** Move to the next round, generating it when needed. */
export function nextRound(state: GameState): GameState {
  const status = advanceStatus(state);
  if (status === 'incomplete') {
    throw new EngineError('ROUND_INCOMPLETE', 'Enter every score before starting the next round.');
  }
  if (status === 'finished') throw new EngineError('NO_MORE_ROUNDS', 'This was the last round.');
  const next = state.current + 1;
  const rounds = state.rounds.slice();
  if (!rounds[next]) rounds.push(generateRound(state, next));
  return { ...state, rounds, current: next };
}

/**
 * Normalise a score for the game's scoring type. For "total", a missing side
 * is filled in so the two sides add up to the match total.
 */
export function normalizeScore(scoring: Scoring, a: number, b?: number | null): [number, number] {
  if (!Number.isInteger(a) || a < 0 || (b != null && (!Number.isInteger(b) || b < 0))) {
    throw new EngineError('INVALID_SCORE', 'Scores must be whole numbers of zero or more.');
  }
  switch (scoring.type) {
    case 'total': {
      const total = scoring.points ?? 24;
      const other = b ?? total - a;
      if (a > total || a + other !== total) {
        throw new EngineError('INVALID_SCORE', `Scores must add up to ${total}.`);
      }
      return [a, other];
    }
    case 'first_to': {
      const target = scoring.points ?? 21;
      if (b == null) throw new EngineError('INVALID_SCORE', 'Enter both scores.');
      if (Math.max(a, b) !== target || Math.min(a, b) >= target) {
        throw new EngineError('INVALID_SCORE', `One team must reach exactly ${target}.`);
      }
      return [a, b];
    }
    case 'off': {
      // Result only: 1–0 for a win, 0–0 for a draw.
      const other = b ?? 0;
      return a > other ? [1, 0] : a < other ? [0, 1] : [0, 0];
    }
    case 'timed':
      if (b == null) throw new EngineError('INVALID_SCORE', 'Enter both scores.');
      return [a, b];
  }
}

export interface ScoreResult {
  state: GameState;
  /** Round indexes that were regenerated because earlier results changed. */
  regenerated: number[];
}

export function setScore(
  state: GameState,
  roundIndex: number,
  matchIndex: number,
  scoreA: number | null,
  scoreB?: number | null,
): ScoreResult {
  const round = state.rounds[roundIndex];
  if (!round || roundIndex > state.current) throw new EngineError('INVALID_ROUND', 'That round has not started yet.');
  const match = round.matches[matchIndex];
  if (!match) throw new EngineError('INVALID_MATCH', 'No such match.');

  const [a, b] = scoreA === null ? [null, null] : normalizeScore(state.settings.scoring, scoreA, scoreB);
  const rounds = state.rounds.map((r, i) =>
    i === roundIndex
      ? { ...r, matches: r.matches.map((m, j) => (j === matchIndex ? { ...m, scoreA: a, scoreB: b } : m)) }
      : r,
  );
  let next: GameState = { ...state, rounds };

  // Results feed later pairings in dynamic modes: rebuild later rounds nobody has scored yet.
  const regenerated: number[] = [];
  if (modeInfo(state.settings.mode).dynamic) {
    for (let i = roundIndex + 1; i < next.rounds.length; i++) {
      if (next.rounds[i].matches.some(isScored)) continue;
      const r = generateRound(next, i);
      next = { ...next, rounds: next.rounds.map((x, j) => (j === i ? r : x)) };
      regenerated.push(i);
    }
  }
  return { state: next, regenerated };
}

/** Manual shuffle: swap two players in a round nobody has scored yet (either may be sitting out). */
export function swapPlayers(state: GameState, roundIndex: number, idA: string, idB: string): GameState {
  const round = state.rounds[roundIndex];
  if (!round) throw new EngineError('INVALID_ROUND', 'No such round.');
  if (round.matches.some(isScored)) throw new EngineError('ROUND_STARTED', 'Players can only be swapped before scoring starts.');
  if (modeInfo(state.settings.mode).teams) throw new EngineError('FIXED_TEAMS', 'Teams are fixed in this mode.');
  const swap = (id: string) => (id === idA ? idB : id === idB ? idA : id);
  const swapped: Round = {
    ...round,
    matches: round.matches.map((m) => ({
      ...m,
      teamA: [swap(m.teamA[0]), swap(m.teamA[1])],
      teamB: [swap(m.teamB[0]), swap(m.teamB[1])],
    })),
    byes: round.byes.map(swap),
  };
  return { ...state, rounds: state.rounds.map((r, i) => (i === roundIndex ? swapped : r)) };
}

/** Player count per court slot helper for UIs. */
export function unitsCount(state: GameState): number {
  return unitsOf(state.settings, state.players).length;
}
