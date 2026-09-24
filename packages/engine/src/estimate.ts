import { modeInfo, plannedRounds, autoRounds } from './modes';
import type { Settings } from './types';

/** Average seconds per rally point, and changeover between rounds (FR-1.14). */
export const SECONDS_PER_POINT = 35;
export const CHANGEOVER_MINUTES = 3;

export interface Estimate {
  rounds: number;
  matches: number;
  /** Matches per player (min–max when sit-outs make it uneven). */
  perPlayerMin: number;
  perPlayerMax: number;
  byesPerPlayerMax: number;
  minutes: number;
  openEnded: boolean;
}

export function roundMinutes(settings: Settings): number {
  const { scoring } = settings;
  switch (scoring.type) {
    case 'total':
      return ((scoring.points ?? 24) * SECONDS_PER_POINT) / 60 + CHANGEOVER_MINUTES;
    case 'first_to':
      return ((scoring.points ?? 21) * 1.6 * SECONDS_PER_POINT) / 60 + CHANGEOVER_MINUTES;
    case 'timed':
      return (scoring.minutes ?? 15) + CHANGEOVER_MINUTES;
    case 'off':
      return 15 + CHANGEOVER_MINUTES;
  }
}

export function estimate(settings: Settings, playerCount: number): Estimate {
  const planned = plannedRounds(settings, playerCount);
  const rounds = planned ?? autoRounds(settings, playerCount);
  const teams = modeInfo(settings.mode).teams;
  const units = teams ? playerCount / 2 : playerCount;
  const perRound = settings.courts * (teams ? 2 : 4);
  const playingSlots = rounds * Math.min(perRound, units);
  const perPlayerMin = Math.floor(playingSlots / units);
  const perPlayerMax = Math.ceil(playingSlots / units);
  const idleSlots = rounds * Math.max(0, units - perRound);
  return {
    rounds,
    matches: rounds * Math.min(settings.courts, Math.floor(units / (teams ? 2 : 4))),
    perPlayerMin,
    perPlayerMax,
    byesPerPlayerMax: Math.ceil(idleSlots / units),
    minutes: Math.round(rounds * roundMinutes(settings)),
    openEnded: planned === null,
  };
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
}
