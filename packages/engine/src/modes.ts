import type { ModeId, Player, Settings, ValidationError } from './types';

export interface ModeInfo {
  id: ModeId;
  name: string;
  summary: string;
  /** Players form fixed pairs for the whole game. */
  teams: boolean;
  /** Pairings depend on results, so rounds are generated one at a time. */
  dynamic: boolean;
  /** Player count must equal courts × 4. */
  fullCourts: boolean;
  /** Players are split into two sides (Mixicano). */
  sides: boolean;
}

export const MODES: readonly ModeInfo[] = [
  {
    id: 'americano',
    name: 'Americano',
    summary: 'Partners rotate every round. Everyone collects the points their team scores.',
    teams: false,
    dynamic: false,
    fullCourts: false,
    sides: false,
  },
  {
    id: 'team-americano',
    name: 'Team Americano',
    summary: 'Fixed pairs play a round-robin against every other pair.',
    teams: true,
    dynamic: false,
    fullCourts: false,
    sides: false,
  },
  {
    id: 'mexicano',
    name: 'Mexicano',
    summary: 'After round one, players are grouped by standings so every match stays close.',
    teams: false,
    dynamic: true,
    fullCourts: false,
    sides: false,
  },
  {
    id: 'team-mexicano',
    name: 'Team Mexicano',
    summary: 'Fixed pairs are matched against pairs with similar standings each round.',
    teams: true,
    dynamic: true,
    fullCourts: false,
    sides: false,
  },
  {
    id: 'mixicano',
    name: 'Mixicano',
    summary: 'Mexicano for mixed groups: every team has one player from each side.',
    teams: false,
    dynamic: true,
    fullCourts: false,
    sides: true,
  },
  {
    id: 'beat-the-box',
    name: 'Beat the Box',
    summary: 'Groups of four play all three partner combinations, then the box winner moves up.',
    teams: false,
    dynamic: true,
    fullCourts: true,
    sides: false,
  },
  {
    id: 'up-and-down',
    name: 'Up & Down',
    summary: 'Winners move up a court, losers move down, and partners split every round.',
    teams: false,
    dynamic: true,
    fullCourts: true,
    sides: false,
  },
  {
    id: 'team-up-and-down',
    name: 'Team Up & Down',
    summary: 'Fixed pairs climb the courts: winning pairs move up, losing pairs move down.',
    teams: true,
    dynamic: true,
    fullCourts: true,
    sides: false,
  },
];

export function modeInfo(id: ModeId): ModeInfo {
  const m = MODES.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown mode: ${id}`);
  return m;
}

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 24;
export const MAX_COURTS = 6;

export function maxCourts(playerCount: number): number {
  return Math.max(1, Math.min(MAX_COURTS, Math.floor(playerCount / 4)));
}

export function defaultSettings(mode: ModeId = 'americano', playerCount = 8): Settings {
  return {
    mode,
    courts: Math.min(2, maxCourts(playerCount)),
    scoring: { type: 'total', points: 24 },
    shuffle: modeInfo(mode).dynamic ? 'standings' : 'balanced',
    leaderboard: 'points',
    rounds: { type: 'auto' },
    byePoints: 'none',
  };
}

export function validate(settings: Settings, players: Player[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const info = modeInfo(settings.mode);
  const n = players.length;

  if (n < MIN_PLAYERS) errors.push({ code: 'TOO_FEW_PLAYERS', message: `At least ${MIN_PLAYERS} players are needed.` });
  if (n > MAX_PLAYERS) errors.push({ code: 'TOO_MANY_PLAYERS', message: `At most ${MAX_PLAYERS} players are supported.` });

  if (new Set(players.map((p) => p.id)).size !== n) {
    errors.push({ code: 'DUPLICATE_ID', message: 'Player ids must be unique.' });
  }

  if (!Number.isInteger(settings.courts) || settings.courts < 1 || settings.courts > maxCourts(n)) {
    errors.push({ code: 'INVALID_COURTS', message: `Choose between 1 and ${maxCourts(n)} courts for ${n} players.` });
  }

  if (info.fullCourts && n !== settings.courts * 4) {
    errors.push({
      code: 'MULTIPLE_OF_FOUR',
      message: `${info.name} needs exactly 4 players per court (${settings.courts * 4} players for ${settings.courts} court${settings.courts > 1 ? 's' : ''}).`,
    });
  }

  if (info.teams) {
    const byTeam = new Map<string, number>();
    for (const p of players) {
      if (!p.teamId) {
        errors.push({ code: 'INVALID_TEAMS', message: `${p.name} has no partner.` });
        break;
      }
      byTeam.set(p.teamId, (byTeam.get(p.teamId) ?? 0) + 1);
    }
    if ([...byTeam.values()].some((c) => c !== 2)) {
      errors.push({ code: 'INVALID_TEAMS', message: 'Every team needs exactly two players.' });
    }
  }

  if (info.sides) {
    const missing = players.filter((p) => !p.side);
    if (missing.length) errors.push({ code: 'MISSING_SIDE', message: 'Every player needs a side.' });
    const a = players.filter((p) => p.side === 'A').length;
    const b = players.filter((p) => p.side === 'B').length;
    if (a !== b) errors.push({ code: 'UNEQUAL_SIDES', message: `Sides must be equal (${a} vs ${b}).` });
  }

  const { scoring } = settings;
  if (scoring.type === 'total' || scoring.type === 'first_to') {
    const p = scoring.points ?? 0;
    if (!Number.isInteger(p) || p < 4 || p > 64) {
      errors.push({ code: 'INVALID_POINTS', message: 'Points per match must be between 4 and 64.' });
    }
  }

  return errors;
}

/** Units that take a court slot: single players, or team ids in team modes. */
export function unitsOf(settings: Settings, players: Player[]): string[] {
  if (!modeInfo(settings.mode).teams) return players.map((p) => p.id);
  return [...new Set(players.map((p) => p.teamId!))];
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Round count for "auto": a full rotation when everyone plays each round,
 * otherwise a whole number of sit-out cycles so byes stay equal.
 */
export function autoRounds(settings: Settings, playerCount: number): number {
  const info = modeInfo(settings.mode);
  if (info.id === 'beat-the-box') return 6;

  const units = info.teams ? playerCount / 2 : playerCount;
  const perRound = info.teams ? settings.courts * 2 : settings.courts * 4;
  const idle = Math.max(0, units - perRound);
  const target = Math.min(units - 1, info.teams ? 9 : 10);

  if (idle === 0) return Math.max(1, target);
  const cycle = units / gcd(units, idle);
  if (cycle >= target) return Math.min(cycle, 12);
  let rounds = cycle * Math.max(1, Math.floor(target / cycle));
  while (rounds < 4) rounds += cycle;
  return rounds;
}

export function plannedRounds(settings: Settings, playerCount: number): number | null {
  switch (settings.rounds.type) {
    case 'auto':
      return autoRounds(settings, playerCount);
    case 'fixed':
      return Math.max(1, Math.min(30, Math.floor(settings.rounds.count)));
    case 'open':
      return null;
  }
}
