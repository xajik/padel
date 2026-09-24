export type ModeId =
  | 'americano'
  | 'team-americano'
  | 'mexicano'
  | 'team-mexicano'
  | 'mixicano'
  | 'beat-the-box'
  | 'up-and-down'
  | 'team-up-and-down';

export type ScoringType = 'total' | 'first_to' | 'timed' | 'off';
export type ShuffleMode = 'balanced' | 'random' | 'standings' | 'manual';
export type LeaderboardMode = 'points' | 'wins' | 'average';
export type Side = 'A' | 'B';

export type RoundsSetting =
  | { type: 'auto' }
  | { type: 'fixed'; count: number }
  | { type: 'open' };

export interface Scoring {
  type: ScoringType;
  /** Total points per match (total) or target (first_to). */
  points?: number;
  /** Minutes per round (timed). */
  minutes?: number;
}

export interface Settings {
  mode: ModeId;
  courts: number;
  scoring: Scoring;
  shuffle: ShuffleMode;
  leaderboard: LeaderboardMode;
  rounds: RoundsSetting;
  /** Points credited to a player sitting out. */
  byePoints: 'none' | 'average';
}

export interface Player {
  id: string;
  name: string;
  /** Mixicano side. */
  side?: Side;
  /** Team modes: players sharing a teamId play together all game. */
  teamId?: string;
}

export type Team = [string, string];

export interface Match {
  court: number;
  teamA: Team;
  teamB: Team;
  scoreA: number | null;
  scoreB: number | null;
}

export interface Round {
  index: number;
  matches: Match[];
  /** Player ids sitting out. */
  byes: string[];
}

export interface GameState {
  settings: Settings;
  players: Player[];
  seed: string;
  /** Rounds generated so far (schedule modes pre-generate every round). */
  rounds: Round[];
  /** Index of the round currently being played. */
  current: number;
  /** Planned round count; null for open-ended games. */
  plannedRounds: number | null;
}

export interface Standing {
  /** Player id, or team id in team modes. */
  id: string;
  name: string;
  playerIds: string[];
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  byes: number;
  /** Points including bye compensation; the value leaderboards sort on. */
  score: number;
  /** Positive = moved up since the previous round. */
  movement: number;
}

export interface ValidationError {
  code:
    | 'TOO_FEW_PLAYERS'
    | 'TOO_MANY_PLAYERS'
    | 'INVALID_COURTS'
    | 'UNEQUAL_SIDES'
    | 'MISSING_SIDE'
    | 'MULTIPLE_OF_FOUR'
    | 'INVALID_TEAMS'
    | 'INVALID_POINTS'
    | 'DUPLICATE_ID';
  message: string;
}
