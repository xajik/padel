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
  type Actor,
  type CloudGame,
  type CreateInput,
  type PublicGame,
} from "./game";
import { isAccountUid, room, users, type Mutation, type MutationResult } from "./store";

/** Game operations shared by the MCP tools and the REST API. */

export interface CreateOptions {
  /** Verified Firebase UID of the creator; the game lands in their history. */
  uid?: string;
  source?: CloudGame["source"];
}

export async function createCloudGame(env: Env, siteUrl: string, input: CreateInput, opts: CreateOptions = {}) {
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
      ownerUid: opts.uid ?? `mcp:${keyHash.slice(0, 16)}`,
      status: "live",
      source: opts.source ?? "mcp",
      createdAt: now,
      updatedAt: now,
      state,
      keyHashes: [keyHash],
    };
    if (await room(env, candidate.code).create(candidate)) game = candidate;
  }
  if (!game) throw new ToolError("INTERNAL", "Could not allocate a game code. Try again.");
  if (opts.uid) await users(env, opts.uid).add(game.code, "owner");
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

/** An organizer key and/or a verified UID as an [Actor]. */
export async function actor(key: string | null | undefined, uid?: string | null): Promise<Actor> {
  return { keyHash: key ? await hashKey(key) : undefined, uid: uid ?? undefined };
}

/** Checks edit rights; a signed-in caller with a valid key is added to the game's editors. */
export async function isEditor(env: Env, code: string, who: Actor): Promise<boolean> {
  return (await room(env, normalizeCode(code)).redeem(who)) as boolean;
}

export async function mutateGame(env: Env, codeOrUrl: string, who: Actor, m: Mutation) {
  const code = normalizeCode(codeOrUrl);
  const res = (await room(env, code).mutate(who, m)) as MutationResult;
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

/* ---------------- accounts ---------------- */

/** The user's games (owned or editable), newest activity first. */
export async function myGames(env: Env, uid: string, siteUrl: string) {
  const list = await users(env, uid).list();
  return (list as unknown as { role: "owner" | "editor"; game: PublicGame }[]).map(({ role, game }) => ({ role, ...gameSummary(game, siteUrl), updatedAt: game.updatedAt }));
}

/** A fresh organizer key for an owner or editor, so a new device can edit and pair its watch. */
export async function issueKey(env: Env, codeOrUrl: string, uid: string): Promise<string> {
  const code = normalizeCode(codeOrUrl);
  if (!isValidCode(code)) throw new ToolError("INVALID_CODE", "Game codes have 6 letters and digits, e.g. K7Q2MX.");
  const key = newOrganizerKey();
  if (!(await room(env, code).issueKey(uid, await hashKey(key)))) throw new ToolError("NOT_EDITOR", "You can't edit this game.");
  return key;
}

/** Moves every game of the anonymous UID [from] to the account [to] (FR-3.4). */
export async function mergeAccounts(env: Env, from: string, to: string): Promise<number> {
  if (from === to || !isAccountUid(from) || !isAccountUid(to)) return 0;
  const source = users(env, from);
  const target = users(env, to);
  let moved = 0;
  for (const e of await source.entries()) {
    const role = await room(env, e.code).transfer(from, to);
    if (role) {
      await target.add(e.code, role);
      moved++;
    }
  }
  await source.deleteAll();
  return moved;
}

/** Account deletion (FR-3.7): forget the index and the user's rights on every game. */
export async function deleteAccountData(env: Env, uid: string): Promise<void> {
  const index = users(env, uid);
  for (const e of await index.entries()) await room(env, e.code).forget(uid);
  await index.deleteAll();
}
