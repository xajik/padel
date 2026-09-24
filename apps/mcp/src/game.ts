import {
  computeStandings,
  createGame,
  defaultSettings,
  estimate,
  formatDuration,
  isScored,
  modeInfo,
  nextRound,
  setScore,
  validate,
  type GameState,
  type LeaderboardMode,
  type ModeId,
  type Player,
  type Round,
  type ScoringType,
  type Settings,
  type ShuffleMode,
  type Side,
} from "@padel/engine";

/** Game document stored in the GameRoom Durable Object (mirrors web StoredGame + key hashes). */
export interface CloudGame {
  id: string;
  code: string;
  name: string;
  ownerUid: string;
  status: "live" | "done";
  source: "web" | "mcp" | "app";
  client?: string;
  createdAt: number;
  updatedAt: number;
  state: GameState;
  /** SHA-256 hex of organizer keys allowed to edit. The keys themselves are never stored. */
  keyHashes: string[];
}

export type PublicGame = Omit<CloudGame, "keyHashes">;

export function publicGame(g: CloudGame): PublicGame {
  const { keyHashes: _omit, ...rest } = g;
  return rest;
}

export class ToolError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/* ---------------- identifiers & keys ---------------- */

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newJoinCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function normalizeCode(input: string): string {
  const m = input.trim().toUpperCase().match(/([A-Z2-9]{6})(?:[/?#].*)?$/);
  return m ? m[1] : input.trim().toUpperCase();
}

export function isValidCode(code: string): boolean {
  return new RegExp(`^[${CODE_ALPHABET}]{6}$`).test(code);
}

export function newOrganizerKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------------- building games ---------------- */

export interface CreateInput {
  mode: ModeId;
  names?: string[];
  players?: number;
  courts?: number;
  scoring?: ScoringType;
  points?: number;
  minutes?: number;
  shuffle?: ShuffleMode;
  leaderboard?: LeaderboardMode;
  rounds?: number | "auto" | "open";
  name?: string;
  sides?: Side[];
  byeCompensation?: boolean;
}

/** Strip control characters and markup from user-supplied names (FR-8.4.2). */
export function cleanName(raw: string, max = 24): string {
  return raw
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function buildPlayers(input: CreateInput): Player[] {
  const info = modeInfo(input.mode);
  const names = (input.names ?? []).map((n) => cleanName(n)).filter(Boolean);
  const count = Math.max(names.length, input.players ?? 0) || 8;
  const used = new Map<string, number>();
  return Array.from({ length: count }, (_, i) => {
    let name = names[i] || `Player ${i + 1}`;
    const seen = used.get(name.toLowerCase()) ?? 0;
    used.set(name.toLowerCase(), seen + 1);
    if (seen) name = `${name} ${seen + 1}`;
    return {
      id: `p${i + 1}`,
      name,
      ...(info.teams ? { teamId: `t${Math.floor(i / 2) + 1}` } : {}),
      ...(info.sides ? { side: input.sides?.[i] ?? (i % 2 === 0 ? "A" : "B") } : {}),
    };
  });
}

export function buildSettings(input: CreateInput, playerCount: number): Settings {
  const base = defaultSettings(input.mode, playerCount);
  const info = modeInfo(input.mode);
  const scoring = input.scoring ?? "total";
  return {
    ...base,
    courts: info.fullCourts ? Math.max(1, Math.floor(playerCount / 4)) : (input.courts ?? base.courts),
    scoring:
      scoring === "timed"
        ? { type: "timed", minutes: input.minutes ?? 15 }
        : scoring === "off"
          ? { type: "off" }
          : { type: scoring, points: input.points ?? (scoring === "first_to" ? 21 : 24) },
    shuffle: info.dynamic ? "standings" : (input.shuffle === "standings" ? "balanced" : (input.shuffle ?? "balanced")),
    leaderboard: scoring === "off" ? "wins" : (input.leaderboard ?? "points"),
    rounds:
      input.rounds === "open"
        ? { type: "open" }
        : typeof input.rounds === "number"
          ? { type: "fixed", count: input.rounds }
          : { type: "auto" },
    byePoints: input.byeCompensation ? "average" : "none",
  };
}

export function defaultGameName(mode: ModeId, date = new Date()): string {
  const day = date.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  const dm = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${day} ${modeInfo(mode).name} · ${dm}`;
}

export function prepareGame(input: CreateInput): { state: GameState; players: Player[]; settings: Settings } {
  const players = buildPlayers(input);
  const settings = buildSettings(input, players.length);
  const errors = validate(settings, players);
  if (errors.length) throw new ToolError(errors[0].code, fixHint(errors[0].code, errors[0].message));
  return { state: createGame(settings, players), players, settings };
}

function fixHint(code: string, message: string): string {
  const hints: Record<string, string> = {
    INVALID_COURTS: "Use fewer courts or add players (4 players per court).",
    MULTIPLE_OF_FOUR: "Add or remove players so the count is a multiple of 4, or pick Americano/Mexicano.",
    UNEQUAL_SIDES: "Pass `sides` with the same number of 'A' and 'B' entries.",
    TOO_FEW_PLAYERS: "Pass at least 4 names or players: 4.",
    TOO_MANY_PLAYERS: "At most 24 players.",
    INVALID_TEAMS: "Team modes need an even number of players; consecutive names form a pair.",
    INVALID_POINTS: "points must be between 4 and 64.",
  };
  return `${message} ${hints[code] ?? ""}`.trim();
}

/* ---------------- operations ---------------- */

export function applyScore(g: CloudGame, court: number, scoreA: number | null, scoreB: number | null | undefined, round?: number) {
  if (g.status === "done") throw new ToolError("GAME_FINISHED", "The game is finished. Nothing more can be scored.");
  const roundIndex = round ? round - 1 : g.state.current;
  const r = g.state.rounds[roundIndex];
  if (!r || roundIndex > g.state.current) throw new ToolError("INVALID_ROUND", `Round ${round} has not started. Current round is ${g.state.current + 1}.`);
  const matchIndex = r.matches.findIndex((m) => m.court === court);
  if (matchIndex === -1) throw new ToolError("INVALID_COURT", `Round ${roundIndex + 1} has courts ${r.matches.map((m) => m.court).join(", ")}.`);
  try {
    const res = setScore(g.state, roundIndex, matchIndex, scoreA, scoreB);
    return { game: { ...g, state: res.state, updatedAt: Date.now() }, regenerated: res.regenerated.map((i) => i + 1) };
  } catch (e) {
    throw new ToolError("INVALID_SCORE", e instanceof Error ? e.message : String(e));
  }
}

export function advance(g: CloudGame): CloudGame {
  if (g.status === "done") throw new ToolError("GAME_FINISHED", "The game is finished.");
  const missing = g.state.rounds[g.state.current].matches.filter((m) => !isScored(m)).map((m) => m.court);
  if (missing.length) throw new ToolError("ROUND_INCOMPLETE", `Enter scores for court ${missing.join(", ")} first.`);
  try {
    return { ...g, state: nextRound(g.state), updatedAt: Date.now() };
  } catch (e) {
    throw new ToolError("NO_MORE_ROUNDS", `${e instanceof Error ? e.message : e} Call finish_game.`);
  }
}

/* ---------------- views ---------------- */

export function roundView(state: GameState, r: Round) {
  const name = (id: string) => state.players.find((p) => p.id === id)?.name ?? id;
  return {
    round: r.index + 1,
    matches: r.matches.map((m) => ({
      court: m.court,
      teamA: m.teamA.map(name),
      teamB: m.teamB.map(name),
      scoreA: m.scoreA,
      scoreB: m.scoreB,
    })),
    sittingOut: r.byes.map(name),
  };
}

export function standingsView(state: GameState) {
  return computeStandings(state).map((s) => ({
    rank: s.rank,
    name: s.name,
    score: s.score,
    played: s.played,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses,
    diff: s.diff,
    movement: s.movement,
  }));
}

export function gameSummary(g: PublicGame, siteUrl: string) {
  const { state } = g;
  const est = estimate(state.settings, state.players.length);
  return {
    code: g.code,
    name: g.name,
    status: g.status,
    mode: state.settings.mode,
    modeName: modeInfo(state.settings.mode).name,
    players: state.players.map((p) => p.name),
    courts: state.settings.courts,
    scoring: state.settings.scoring,
    leaderboard: state.settings.leaderboard,
    currentRound: state.current + 1,
    plannedRounds: state.plannedRounds,
    estimatedDuration: formatDuration(est.minutes),
    spectatorUrl: `${siteUrl}/g/${g.code}`,
  };
}

export function standingsMarkdown(rows: ReturnType<typeof standingsView>): string {
  return [
    "| # | Player | Score | W-D-L | +/− |",
    "|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.rank} | ${r.name} | ${r.score} | ${r.wins}-${r.draws}-${r.losses} | ${r.diff > 0 ? "+" : ""}${r.diff} |`),
  ].join("\n");
}

export function roundMarkdown(v: ReturnType<typeof roundView>): string {
  const lines = v.matches.map(
    (m) => `- Court ${m.court}: ${m.teamA.join(" & ")} vs ${m.teamB.join(" & ")}${m.scoreA !== null ? ` — ${m.scoreA}–${m.scoreB}` : ""}`,
  );
  if (v.sittingOut.length) lines.push(`- Sitting out: ${v.sittingOut.join(", ")}`);
  return `Round ${v.round}\n${lines.join("\n")}`;
}
