import { createMcpHandler } from "agents/mcp/server";
import type { GameState } from "@padel/engine";
import { hashKey, isValidCode, normalizeCode } from "./game";
import { handleRest } from "./rest";
import { createServer } from "./server";
import { room, type Mutation } from "./store";

export { GameRoom } from "./store";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Organizer-Key",
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

async function handleMcp(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const ip = clientIp(req);
  const tool = await calledTool(req);
  const createAllowed = tool === "create_game" ? (await env.CREATE_LIMITER.limit({ key: ip })).success : true;
  const handler = createMcpHandler(
    () => createServer({ env, siteUrl: env.SITE_URL, allowCreate: async () => createAllowed }),
    {
      route: "/mcp",
      allowedHostnames: env.ALLOWED_HOSTS.split(","),
    },
  );
  return handler(req, env, ctx);
}

/**
 * Public game API used by the web app (proxied through its service binding):
 *   GET  /api/games/:code          → public game (no key hashes)
 *   POST /api/games/:code/redeem   → { editor: boolean } for an organizer key
 *   POST /api/games/:code/mutate   → apply a mutation (X-Organizer-Key header)
 */
async function handleApi(req: Request, env: Env, parts: string[]): Promise<Response> {
  const code = normalizeCode(parts[0] ?? "");
  if (!isValidCode(code)) return json({ error: { code: "INVALID_CODE", message: "Invalid game code." } }, 400);
  const stub = room(env, code);

  if (parts.length === 1 && req.method === "GET") {
    const g = await stub.read();
    return g ? json({ game: g }) : json({ error: { code: "NOT_FOUND", message: "No such game." } }, 404);
  }

  const key = req.headers.get("X-Organizer-Key") ?? "";
  if (!key) return json({ error: { code: "NOT_EDITOR", message: "Organizer key required." } }, 401);
  const keyHash = await hashKey(key);

  if (parts[1] === "redeem" && req.method === "POST") {
    return json({ editor: await stub.authorize(keyHash) });
  }
  if (parts[1] === "mutate" && req.method === "POST") {
    const body = (await req.json().catch(() => null)) as Mutation | null;
    if (!body || !["score", "next", "finish", "reopen", "replace"].includes(body.type)) {
      return json({ error: { code: "INVALID_MUTATION", message: "Unknown mutation." } }, 400);
    }
    if (body.type === "replace" && !isGameState(body.state)) {
      return json({ error: { code: "INVALID_STATE", message: "Malformed game state." } }, 400);
    }
    const res = await stub.mutate(keyHash, body);
    return res.ok ? json(res) : json({ error: { code: res.code, message: res.message } }, res.code === "NOT_EDITOR" ? 403 : 409);
  }
  return json({ error: { code: "NOT_FOUND", message: "Unknown endpoint." } }, 404);
}

function isGameState(s: unknown): s is GameState {
  const g = s as GameState;
  return !!g && typeof g === "object" && Array.isArray(g.players) && Array.isArray(g.rounds) && typeof g.current === "number" && !!g.settings;
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "OPTIONS" && url.pathname.startsWith("/api/games/")) return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === "/mcp" || url.pathname.startsWith("/api/")) {
      const { success } = await env.REQUEST_LIMITER.limit({ key: clientIp(req) });
      if (!success) return json({ error: { code: "RATE_LIMITED", message: "Too many requests. Slow down." } }, 429);
    }

    if (url.pathname === "/mcp") return handleMcp(req, env, ctx);
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
} satisfies ExportedHandler<Env>;
