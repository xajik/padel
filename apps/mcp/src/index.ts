import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { createMcpHandler } from "agents/mcp/server";
import type { GameState } from "@padel/engine";
import { identity, verifyIdToken, type Identity } from "./auth";
import { isValidCode, normalizeCode, ToolError } from "./game";
import { handleOAuth, type AccountProps } from "./oauth";
import { handleRest } from "./rest";
import { createServer } from "./server";
import { deleteAccountData, issueKey, mergeAccounts, myGames, actor } from "./service";
import { room, type Mutation } from "./store";

export { GameRoom, UserGames } from "./store";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Organizer-Key",
};

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { ...CORS, "Cache-Control": "no-store" } });

function clientIp(req: Request): string {
  return req.headers.get("CF-Connecting-IP") ?? "local";
}

/** Peek at a JSON-RPC body to find which tool is being called (for per-tool rate limits). */
async function calledTool(req: Request): Promise<string | null> {
  if (req.method !== "POST") return null;
  try {
    const body = (await req.clone().json()) as { method?: string; params?: { name?: string } } | { method?: string; params?: { name?: string } }[];
    const msgs = Array.isArray(body) ? body : [body];
    return msgs.find((m) => m.method === "tools/call")?.params?.name ?? null;
  } catch {
    return null;
  }
}

async function handleMcp(req: Request, env: Env, ctx: ExecutionContext, user?: AccountProps): Promise<Response> {
  const ip = clientIp(req);
  const tool = await calledTool(req);
  const createAllowed = tool === "create_game" ? (await env.CREATE_LIMITER.limit({ key: ip })).success : true;
  const handler = createMcpHandler(
    () => createServer({ env, siteUrl: env.SITE_URL, allowCreate: async () => createAllowed, user }),
    {
      route: user ? ACCOUNT_MCP : "/mcp",
      allowedHostnames: env.ALLOWED_HOSTS.split(","),
      ...(user ? { authContext: { props: { ...user } } } : {}),
    },
  );
  return handler(req, env, ctx);
}

/** Signed-in MCP endpoint; workers-oauth-provider only lets requests with a valid access token through. */
const ACCOUNT_MCP = "/mcp/account";

const accountMcp: ExportedHandler<Env> = {
  fetch(req, env, ctx) {
    const props = (ctx as ExecutionContext & { props?: AccountProps }).props;
    if (!props?.uid) return json({ error: { code: "UNAUTHORIZED", message: "Sign in required." } }, 401);
    return handleMcp(req, env, ctx, props);
  },
};

/**
 * Public game API used by the web app and the native apps (proxied through the web's service binding):
 *   GET  /api/games/:code          → public game (no key hashes)
 *   POST /api/games/:code/redeem   → { editor: boolean } for an organizer key and/or signed-in user
 *   POST /api/games/:code/mutate   → apply a mutation (X-Organizer-Key header and/or ID token)
 *   POST /api/games/:code/keys     → { organizerKey } for the owner or an editor (ID token)
 *
 * A Firebase ID token in `Authorization: Bearer` identifies the user; a signed-in user who redeems
 * a valid key becomes an editor of the game.
 */
async function handleApi(req: Request, env: Env, parts: string[]): Promise<Response> {
  const code = normalizeCode(parts[0] ?? "");
  if (!isValidCode(code)) return json({ error: { code: "INVALID_CODE", message: "Invalid game code." } }, 400);
  const stub = room(env, code);

  if (parts.length === 1 && req.method === "GET") {
    const g = await stub.read();
    return g ? json({ game: g }) : json({ error: { code: "NOT_FOUND", message: "No such game." } }, 404);
  }

  const user = req.headers.has("Authorization") ? await identity(req, env) : null;
  if (req.headers.has("Authorization") && !user) return json({ error: { code: "UNAUTHORIZED", message: "The ID token is invalid or expired." } }, 401);
  const key = req.headers.get("X-Organizer-Key");
  if (!key && !user) return json({ error: { code: "NOT_EDITOR", message: "Organizer key required." } }, 401);
  const who = await actor(key, user?.uid);

  if (parts[1] === "redeem" && req.method === "POST") {
    return json({ editor: await stub.redeem(who) });
  }
  if (parts[1] === "keys" && req.method === "POST") {
    if (!user) return json({ error: { code: "UNAUTHORIZED", message: "Sign in required." } }, 401);
    try {
      return json({ organizerKey: await issueKey(env, code, user.uid) });
    } catch (e) {
      if (e instanceof ToolError) return json({ error: { code: e.code, message: e.message } }, 403);
      throw e;
    }
  }
  if (parts[1] === "mutate" && req.method === "POST") {
    const body = (await req.json().catch(() => null)) as Mutation | null;
    if (!body || !["score", "next", "finish", "reopen", "replace"].includes(body.type)) {
      return json({ error: { code: "INVALID_MUTATION", message: "Unknown mutation." } }, 400);
    }
    if (body.type === "replace" && !isGameState(body.state)) {
      return json({ error: { code: "INVALID_STATE", message: "Malformed game state." } }, 400);
    }
    const res = await stub.mutate(who, body);
    return res.ok ? json(res) : json({ error: { code: res.code, message: res.message } }, res.code === "NOT_EDITOR" ? 403 : 409);
  }
  return json({ error: { code: "NOT_FOUND", message: "Unknown endpoint." } }, 404);
}

/**
 * Account API (Firebase ID token required):
 *   GET    /api/me/games   → { games } the user owns or edits, newest activity first
 *   POST   /api/me/merge   { fromIdToken } → { moved } games of an anonymous session into this account (FR-3.4)
 *   DELETE /api/me         → forget the user's index and rights on every game (FR-3.7)
 */
async function handleMe(req: Request, env: Env, parts: string[]): Promise<Response> {
  const user = await identity(req, env);
  if (!user) return json({ error: { code: "UNAUTHORIZED", message: "Sign in required." } }, 401);

  if (parts[0] === "games" && parts.length === 1 && req.method === "GET") {
    return json({ games: await myGames(env, user.uid, env.SITE_URL) });
  }
  if (parts[0] === "merge" && parts.length === 1 && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { fromIdToken?: string };
    const from: Identity | null = body.fromIdToken ? await verifyIdToken(body.fromIdToken, env.FIREBASE_PROJECT_ID) : null;
    // Both tokens prove the caller holds both accounts; only anonymous sessions are folded in.
    if (!from || !from.anonymous) return json({ error: { code: "INVALID_SOURCE", message: "fromIdToken must be a valid anonymous session." } }, 400);
    return json({ moved: await mergeAccounts(env, from.uid, user.uid) });
  }
  if (parts.length === 0 && req.method === "DELETE") {
    await deleteAccountData(env, user.uid);
    return json({ deleted: true });
  }
  return json({ error: { code: "NOT_FOUND", message: "Unknown endpoint." } }, 404);
}

function isGameState(s: unknown): s is GameState {
  const g = s as GameState;
  return !!g && typeof g === "object" && Array.isArray(g.players) && Array.isArray(g.rounds) && typeof g.current === "number" && !!g.settings;
}

/** Everything that is not the signed-in MCP endpoint or the OAuth protocol routes. */
const router: ExportedHandler<Env> = {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS" && (url.pathname.startsWith("/api/games/") || url.pathname.startsWith("/api/me"))) {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === "/mcp") return handleMcp(req, env, ctx);
    if (url.pathname.startsWith("/oauth/")) return handleOAuth(req, env, url.pathname);
    if (url.pathname === "/api/me" || url.pathname.startsWith("/api/me/")) {
      return handleMe(req, env, url.pathname.slice("/api/me".length).split("/").filter(Boolean));
    }
    if (url.pathname === "/api/v1/games" || url.pathname.startsWith("/api/v1/games/")) {
      const parts = url.pathname.slice("/api/v1/games".length).split("/").filter(Boolean);
      const allowCreate = async () => (await env.CREATE_LIMITER.limit({ key: clientIp(req) })).success;
      return handleRest(req, env, parts, allowCreate);
    }
    if (url.pathname.startsWith("/api/games/")) {
      return handleApi(req, env, url.pathname.slice("/api/games/".length).split("/").filter(Boolean));
    }
    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ name: "padel-americano-mcp", mcp: `${env.SITE_URL}/mcp`, docs: `${env.SITE_URL}/docs/mcp` });
    }
    return new Response("Not found", { status: 404 });
  },
};

/** Access tokens are bound to the canonical resource on the site domain, so the provider is built per SITE_URL. */
let oauthProvider: { site: string; provider: OAuthProvider<Env> } | null = null;
function oauth(env: Env): OAuthProvider<Env> {
  if (oauthProvider?.site !== env.SITE_URL) {
    oauthProvider = {
      site: env.SITE_URL,
      provider: new OAuthProvider<Env>({
        apiRoute: ACCOUNT_MCP,
        apiHandler: accountMcp as ExportedHandler<Env> & Pick<Required<ExportedHandler<Env>>, "fetch">,
        defaultHandler: router,
        authorizeEndpoint: "/oauth/authorize",
        tokenEndpoint: "/oauth/token",
        clientRegistrationEndpoint: "/oauth/register",
        scopesSupported: ["games"],
        resourceMetadata: {
          resource: `${env.SITE_URL}${ACCOUNT_MCP}`,
          scopes_supported: ["games"],
          resource_name: "Americanoo (your account)",
        },
      }),
    };
  }
  return oauthProvider.provider;
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const path = new URL(req.url).pathname;
    if (path.startsWith("/mcp") || path.startsWith("/api/") || path.startsWith("/oauth/")) {
      const { success } = await env.REQUEST_LIMITER.limit({ key: clientIp(req) });
      if (!success) return json({ error: { code: "RATE_LIMITED", message: "Too many requests. Slow down." } }, 429);
    }
    return oauth(env).fetch(req, env, ctx);
  },
} satisfies ExportedHandler<Env>;
