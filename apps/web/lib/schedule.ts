import {
  createGame,
  defaultSettings,
  estimate,
  formatDuration,
  maxCourts,
  modeInfo,
  MODES,
  validate,
  type Estimate,
  type GameState,
  type ModeId,
  type Player,
  type Settings,
} from "@padel/engine";
import { absoluteUrl } from "./site";

/** Modes whose full schedule is known up front, so it can be published as a page. */
export const SCHEDULE_MODES: ModeId[] = ["americano", "team-americano"];

export interface ScheduleRequest {
  mode: ModeId;
  players: number;
  courts: number;
  points?: number;
  rounds?: number | "auto";
  names?: string[];
  seed?: string;
}

export interface ScheduleResult {
  request: Required<Omit<ScheduleRequest, "names" | "seed">> & { seed: string };
  state: GameState;
  estimate: Estimate;
  duration: string;
  playUrl: string;
}

export function demoPlayers(mode: ModeId, count: number, names?: string[]): Player[] {
  const info = modeInfo(mode);
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: names?.[i]?.trim() || `Player ${i + 1}`,
    ...(info.teams ? { teamId: `t${Math.floor(i / 2) + 1}` } : {}),
    ...(info.sides ? { side: i % 2 === 0 ? ("A" as const) : ("B" as const) } : {}),
  }));
}

export function isModeId(value: string): value is ModeId {
  return MODES.some((m) => m.id === value);
}

export class ScheduleError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function buildSchedule(req: ScheduleRequest): ScheduleResult {
  const players = demoPlayers(req.mode, req.players, req.names);
  const settings: Settings = {
    ...defaultSettings(req.mode, req.players),
    courts: req.courts,
    scoring: { type: "total", points: req.points ?? 24 },
    rounds: req.rounds && req.rounds !== "auto" ? { type: "fixed", count: req.rounds } : { type: "auto" },
  };
  const errors = validate(settings, players);
  if (errors.length) throw new ScheduleError(errors[0].code, errors[0].message);
  const seed = req.seed ?? `${req.mode}-${req.players}-${req.courts}`;
  const state = createGame(settings, players, seed);
  const est = estimate(settings, req.players);
  return {
    request: {
      mode: req.mode,
      players: req.players,
      courts: req.courts,
      points: req.points ?? 24,
      rounds: req.rounds ?? "auto",
      seed,
    },
    state,
    estimate: est,
    duration: formatDuration(est.minutes),
    playUrl: playUrl(req),
  };
}

export function playUrl(req: Pick<ScheduleRequest, "mode" | "players" | "courts" | "points" | "names">): string {
  const q = new URLSearchParams({ mode: req.mode, players: String(req.players), courts: String(req.courts) });
  if (req.points) q.set("points", String(req.points));
  if (req.names?.length) q.set("names", req.names.join(","));
  return absoluteUrl(`/new?${q}`);
}

export const scheduleSlug = (players: number, courts: number) =>
  `${players}-players-${courts}-court${courts > 1 ? "s" : ""}`;

export function parseScheduleSlug(slug: string): { players: number; courts: number } | null {
  const m = slug.match(/^(\d{1,2})-players-(\d)-courts?$/);
  return m ? { players: Number(m[1]), courts: Number(m[2]) } : null;
}

/** Every valid (mode, players, courts) combination that gets a static schedule page. */
export function scheduleCombos(): { mode: ModeId; players: number; courts: number }[] {
  const out: { mode: ModeId; players: number; courts: number }[] = [];
  for (const mode of SCHEDULE_MODES) {
    const teams = modeInfo(mode).teams;
    for (let n = 4; n <= 24; n++) {
      if (teams && n % 2) continue;
      for (let c = 1; c <= maxCourts(n); c++) out.push({ mode, players: n, courts: c });
    }
  }
  return out;
}

export function nameOf(state: GameState, id: string): string {
  return state.players.find((p) => p.id === id)?.name ?? id;
}

/** Markdown table of a schedule (for .md mirrors, llms-full.txt and the MCP server). */
export function scheduleMarkdown(result: ScheduleResult): string {
  const { state } = result;
  const n = (id: string) => nameOf(state, id);
  const lines = [
    "| Round | " + Array.from({ length: state.settings.courts }, (_, i) => `Court ${i + 1}`).join(" | ") + " | Sitting out |",
    "|---|" + "---|".repeat(state.settings.courts) + "---|",
  ];
  for (const r of state.rounds) {
    const cells = r.matches.map((m) => `${n(m.teamA[0])} & ${n(m.teamA[1])} vs ${n(m.teamB[0])} & ${n(m.teamB[1])}`);
    lines.push(`| ${r.index + 1} | ${cells.join(" | ")} | ${r.byes.map(n).join(", ") || "—"} |`);
  }
  return lines.join("\n");
}
