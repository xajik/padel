import {
  defaultSettings,
  MAX_PLAYERS,
  maxCourts,
  MIN_PLAYERS,
  modeInfo,
  MODES,
  type LeaderboardMode,
  type ModeId,
  type Player,
  type ScoringType,
  type Settings,
  type ShuffleMode,
  type Side,
} from "@padel/engine";

export interface Draft {
  mode: ModeId;
  /** One entry per player; blank → "Player N". */
  names: string[];
  sides: Side[];
  courts: number;
  scoringType: ScoringType;
  points: number;
  minutes: number;
  shuffle: ShuffleMode;
  leaderboard: LeaderboardMode;
  roundsType: "auto" | "fixed" | "open";
  roundsCount: number;
  byeCompensation: boolean;
  name: string;
}

export function initialDraft(mode: ModeId = "americano", count = 8): Draft {
  const s = defaultSettings(mode, count);
  return {
    mode,
    names: Array(count).fill(""),
    sides: Array.from({ length: count }, (_, i) => (i % 2 === 0 ? "A" : "B")),
    courts: s.courts,
    scoringType: "total",
    points: 24,
    minutes: 15,
    shuffle: s.shuffle,
    leaderboard: "points",
    roundsType: "auto",
    roundsCount: 7,
    byeCompensation: false,
    name: "",
  };
}

/** Pre-fill from the agent deep-link contract (FR-7.4.5): /new?mode=&players=&courts=&points=&names= */
export function draftFromQuery(q: URLSearchParams): { draft: Draft; notice: string | null } {
  let notice: string | null = null;
  const modeParam = q.get("mode");
  const mode = MODES.some((m) => m.id === modeParam) ? (modeParam as ModeId) : "americano";
  if (modeParam && mode !== modeParam) notice = `Unknown format “${modeParam}”, using Americano.`;

  const names = (q.get("names") ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, MAX_PLAYERS);
  const requested = Number(q.get("players")) || names.length || 8;
  const count = clamp(Math.max(requested, names.length), MIN_PLAYERS, MAX_PLAYERS);
  if (requested !== count) notice = `Player count adjusted to ${count}.`;

  const draft = initialDraft(mode, count);
  names.forEach((n, i) => (draft.names[i] = n.slice(0, 24)));

  const courts = Number(q.get("courts"));
  if (courts) draft.courts = clamp(courts, 1, maxCourts(count));
  const points = Number(q.get("points"));
  if (points) draft.points = clamp(points, 4, 64);
  return { draft: fitDraft(draft), notice };
}

/** Keep dependent fields valid after a change. */
export function fitDraft(d: Draft): Draft {
  const info = modeInfo(d.mode);
  let count = d.names.length;
  if (info.teams && count % 2) count += 1;
  if (info.fullCourts) count = Math.max(4, Math.round(count / 4) * 4);
  count = clamp(count, MIN_PLAYERS, MAX_PLAYERS);
  const names = resize(d.names, count, "");
  const sides = resize(d.sides, count, "A").map((s, i) => (i < d.sides.length ? s : i % 2 === 0 ? "A" : "B")) as Side[];
  const courts = info.fullCourts ? count / 4 : clamp(d.courts, 1, maxCourts(count));
  const shuffle: ShuffleMode = info.dynamic ? "standings" : d.shuffle === "standings" ? "balanced" : d.shuffle;
  return { ...d, names, sides, courts, shuffle };
}

export function setPlayerCount(d: Draft, count: number): Draft {
  return fitDraft({ ...d, names: resize(d.names, count, "") });
}

export function playerStep(mode: ModeId): number {
  const info = modeInfo(mode);
  return info.fullCourts ? 4 : info.teams ? 2 : 1;
}

export function draftPlayers(d: Draft): Player[] {
  const info = modeInfo(d.mode);
  const used = new Map<string, number>();
  return d.names.map((raw, i) => {
    let name = raw.trim().replace(/\s+/g, " ").slice(0, 24) || `Player ${i + 1}`;
    const seen = used.get(name.toLowerCase()) ?? 0;
    used.set(name.toLowerCase(), seen + 1);
    if (seen) name = `${name} ${seen + 1}`;
    return {
      id: `p${i + 1}`,
      name,
      ...(info.teams ? { teamId: `t${Math.floor(i / 2) + 1}` } : {}),
      ...(info.sides ? { side: d.sides[i] } : {}),
    };
  });
}

export function draftSettings(d: Draft): Settings {
  return {
    mode: d.mode,
    courts: d.courts,
    scoring:
      d.scoringType === "timed"
        ? { type: "timed", minutes: d.minutes }
        : d.scoringType === "off"
          ? { type: "off" }
          : { type: d.scoringType, points: d.points },
    shuffle: d.shuffle,
    leaderboard: d.scoringType === "off" ? "wins" : d.leaderboard,
    rounds:
      d.roundsType === "fixed"
        ? { type: "fixed", count: d.roundsCount }
        : d.roundsType === "open"
          ? { type: "open" }
          : { type: "auto" },
    byePoints: d.byeCompensation ? "average" : "none",
  };
}

export function defaultGameName(mode: ModeId, date = new Date()): string {
  const day = date.toLocaleDateString("en-GB", { weekday: "long" });
  const dm = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${day} ${modeInfo(mode).name} · ${dm}`;
}

function resize<T>(arr: T[], n: number, fill: T): T[] {
  return arr.length >= n ? arr.slice(0, n) : [...arr, ...Array(n - arr.length).fill(fill)];
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, Math.round(n)));
}
