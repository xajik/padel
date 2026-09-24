import {
  defaultGameName,
  gameSummary,
  hashKey,
  isValidCode,
  newJoinCode,
  newOrganizerKey,
  normalizeCode,
  prepareGame,
  roundView,
  standingsView,
  ToolError,
  type CloudGame,
  type CreateInput,
  type PublicGame,
} from "./game";
import { room, type Mutation, type MutationResult } from "./store";

/** Game operations shared by the MCP tools and the REST API. */

export async function createCloudGame(env: Env, siteUrl: string, input: CreateInput) {
  const { state } = prepareGame(input);
  const key = newOrganizerKey();
  const keyHash = await hashKey(key);
  const now = Date.now();
  let game: CloudGame | null = null;
  for (let attempt = 0; attempt < 5 && !game; attempt++) {
    const candidate: CloudGame = {
      id: crypto.randomUUID(),
      code: newJoinCode(),
      name: input.name?.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60) || defaultGameName(state.settings.mode),
      ownerUid: `mcp:${keyHash.slice(0, 16)}`,
      status: "live",
      source: "mcp",
      createdAt: now,
      updatedAt: now,
      state,
      keyHashes: [keyHash],
    };
    if (await room(env, candidate.code).create(candidate)) game = candidate;
  }
  if (!game) throw new ToolError("INTERNAL", "Could not allocate a game code. Try again.");
  return {
    game,
    organizerKey: key,
    organizerUrl: `${siteUrl}/g/${game.code}?key=${key}`,
    qrUrl: `${siteUrl}/g/${game.code}/qr`,
    summary: gameSummary(game, siteUrl),
    round: roundView(state, state.rounds[0]),
  };
}

export async function loadGame(env: Env, codeOrUrl: string): Promise<PublicGame> {
  const code = normalizeCode(codeOrUrl);
  if (!isValidCode(code)) throw new ToolError("INVALID_CODE", "Game codes have 6 letters and digits, e.g. K7Q2MX.");
  const g = (await room(env, code).read()) as PublicGame | null;
  if (!g) throw new ToolError("NOT_FOUND", `No game ${code}. Games created on a phone stay on that phone until cloud sync is enabled.`);
  return g;
}

export async function isEditor(env: Env, code: string, key: string): Promise<boolean> {
  return (await room(env, normalizeCode(code)).authorize(await hashKey(key))) as boolean;
}

export async function mutateGame(env: Env, codeOrUrl: string, key: string, m: Mutation) {
  const code = normalizeCode(codeOrUrl);
  const res = (await room(env, code).mutate(await hashKey(key), m)) as MutationResult;
  if (!res.ok) throw new ToolError(res.code, res.message);
  return res;
}

/** Everything a client needs to show a game: summary, current round, standings. */
export function gameDetails(g: PublicGame, siteUrl: string) {
  return {
    game: gameSummary(g, siteUrl),
    round: roundView(g.state, g.state.rounds[g.state.current]),
    standings: standingsView(g.state),
  };
}

/** Total-points scoring lets callers send one side; fill in the other. */
export function completeScore(g: PublicGame, scoreA?: number | null, scoreB?: number | null): [number | null, number | null] {
  const total = g.state.settings.scoring.type === "total" ? (g.state.settings.scoring.points ?? 24) : null;
  let a = scoreA ?? null;
  const b = scoreB ?? null;
  if (a === null && b !== null && total !== null) a = total - b;
  return [a, b];
}
