import { z } from "zod";
import { roundView, standingsView, ToolError } from "./game";
import { createGameInput, scoreInput } from "./schemas";
import { bearer, identity, isJwt } from "./auth";
import type { Actor } from "./game";
import { actor, completeScore, createCloudGame, gameDetails, loadGame, mutateGame } from "./service";

/**
 * REST game API (documented in /openapi.json) for agents that integrate from an
 * OpenAPI spec instead of MCP, e.g. Meta Muse custom integrations.
 *
 *   POST /api/v1/games                       create (returns organizerKey)
 *   GET  /api/v1/games/{code}                summary + current round + standings
 *   GET  /api/v1/games/{code}/rounds/{n}     one round
 *   POST /api/v1/games/{code}/scores         { court, scoreA?, scoreB?, round? }   (organizer)
 *   POST /api/v1/games/{code}/next           start the next round                (organizer)
 *   POST /api/v1/games/{code}/finish         freeze results                      (organizer)
 *
 * Organizer auth: `Authorization: Bearer <organizerKey>` or `X-Organizer-Key: <organizerKey>`.
 * The apps send a Firebase ID token as `Authorization: Bearer <idToken>` instead: games they create
 * land in the user's account, and the owner can edit without a key.
 */

/** REST-only: the apps say where a game was created. */
const createBody = createGameInput.extend({ source: z.enum(["web", "app"]).optional() });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Organizer-Key",
};

const STATUS: Record<string, number> = {
  INVALID_CODE: 400,
  INVALID_BODY: 400,
  INVALID_SCORE: 422,
  INVALID_COURT: 422,
  INVALID_ROUND: 422,
  INVALID_COURTS: 422,
  MULTIPLE_OF_FOUR: 422,
  UNEQUAL_SIDES: 422,
  MISSING_SIDE: 422,
  TOO_FEW_PLAYERS: 422,
  TOO_MANY_PLAYERS: 422,
  INVALID_TEAMS: 422,
  INVALID_POINTS: 422,
  UNAUTHORIZED: 401,
  NOT_EDITOR: 403,
  NOT_FOUND: 404,
  ROUND_INCOMPLETE: 409,
  GAME_FINISHED: 409,
  NO_MORE_ROUNDS: 409,
  RATE_LIMITED: 429,
};

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  Response.json(data, { status, headers: { ...CORS, "Cache-Control": "no-store", ...extra } });

function error(code: string, message: string) {
  const status = STATUS[code] ?? 500;
  return json({ error: { code, message } }, status, status === 429 ? { "Retry-After": "60" } : {});
}

/** The organizer key (Bearer or X-Organizer-Key) and/or the Firebase user behind a write. */
async function caller(req: Request, env: Env): Promise<Actor> {
  const token = bearer(req);
  const headerKey = req.headers.get("X-Organizer-Key");
  if (token && isJwt(token)) {
    const user = await identity(req, env);
    if (!user) throw new ToolError("UNAUTHORIZED", "The ID token is invalid or expired. Sign in again.");
    return actor(headerKey, user.uid);
  }
  const key = token ?? headerKey;
  if (!key) throw new ToolError("UNAUTHORIZED", "Send the organizer key as `Authorization: Bearer <organizerKey>`.");
  return actor(key);
}

async function body<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const raw = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ToolError("INVALID_BODY", `${issue.path.join(".") || "body"}: ${issue.message}`);
  }
  return parsed.data;
}

export async function handleRest(req: Request, env: Env, parts: string[], allowCreate: () => Promise<boolean>): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const site = env.SITE_URL;
  try {
    // POST /api/v1/games
    if (parts.length === 0) {
      if (req.method !== "POST") return error("NOT_FOUND", "Use POST to create a game.");
      if (!(await allowCreate())) throw new ToolError("RATE_LIMITED", "Too many games created. Try again in a minute.");
      const { source, ...input } = await body(req, createBody);
      const token = bearer(req);
      const user = token && isJwt(token) ? await identity(req, env) : null;
      if (token && isJwt(token) && !user) throw new ToolError("UNAUTHORIZED", "The ID token is invalid or expired. Sign in again.");
      const created = await createCloudGame(env, site, input, { uid: user?.uid, source: source ?? "mcp" });
      return json(
        {
          ...created.summary,
          organizerUrl: created.organizerUrl,
          organizerKey: created.organizerKey,
          qrUrl: created.qrUrl,
          round: created.round,
        },
        201,
      );
    }

    const [code, action, arg] = parts;
    if (req.method === "GET" && !action) return json(gameDetails(await loadGame(env, code), site));
    if (req.method === "GET" && action === "rounds") {
      const g = await loadGame(env, code);
      const idx = Number(arg) - 1;
      const r = g.state.rounds[idx];
      if (!r || idx > g.state.current) throw new ToolError("INVALID_ROUND", `Rounds 1–${g.state.current + 1} are available.`);
      return json(roundView(g.state, r));
    }
    if (req.method === "GET" && action === "standings") {
      const g = await loadGame(env, code);
      return json({ status: g.status, afterRound: g.state.current + 1, standings: standingsView(g.state) });
    }

    if (req.method === "POST" && action === "scores") {
      const who = await caller(req, env);
      const input = await body(req, scoreInput);
      if (input.scoreA === undefined && input.scoreB === undefined) throw new ToolError("INVALID_SCORE", "Send scoreA and/or scoreB.");
      const [a, b] = completeScore(await loadGame(env, code), input.scoreA, input.scoreB);
      const res = await mutateGame(env, code, who, { type: "score", court: input.court, scoreA: a, scoreB: b, round: input.round });
      const g = res.game;
      const round = roundView(g.state, g.state.rounds[input.round ? input.round - 1 : g.state.current]);
      return json({
        round,
        standings: standingsView(g.state),
        regeneratedRounds: res.regenerated,
        roundComplete: round.matches.every((m) => m.scoreA !== null),
      });
    }
    if (req.method === "POST" && action === "next") {
      const { game } = await mutateGame(env, code, await caller(req, env), { type: "next" });
      return json({ round: roundView(game.state, game.state.rounds[game.state.current]), plannedRounds: game.state.plannedRounds });
    }
    if (req.method === "POST" && action === "finish") {
      const { game } = await mutateGame(env, code, await caller(req, env), { type: "finish" });
      const standings = standingsView(game.state);
      return json({ podium: standings.slice(0, 3).map((s) => s.name), standings, spectatorUrl: `${site}/g/${game.code}` });
    }
    return error("NOT_FOUND", "Unknown endpoint. See /openapi.json.");
  } catch (e) {
    if (e instanceof ToolError) return error(e.code, e.message);
    console.error(e);
    return error("INTERNAL", "Something went wrong. Try again.");
  }
}
