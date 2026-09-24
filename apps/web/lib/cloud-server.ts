import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cache } from "react";
import type { StoredGame } from "./games/types";

/** Service binding to the MCP / cloud-game Worker (apps/mcp). */
export function mcpService(): Fetcher | null {
  try {
    return getCloudflareContext().env.MCP ?? null;
  } catch {
    return null;
  }
}

/** Forward a request to the MCP Worker unchanged (same host, so its host checks pass). */
export async function forwardToMcp(req: Request): Promise<Response> {
  const svc = mcpService();
  if (!svc) return Response.json({ error: { code: "UNAVAILABLE", message: "Cloud service not configured." } }, { status: 503 });
  const res = await svc.fetch(new Request(req.url, req));
  // Re-wrap: in local dev the binding returns Miniflare's Response class, which Next.js rejects.
  return new Response(res.body as BodyInit | null, {
    status: res.status,
    statusText: res.statusText,
    headers: new Headers([...res.headers]),
  });
}

/** Server-side read of a cloud (MCP-created) game for SSR and link previews. */
export const getCloudGame = cache(async (code: string): Promise<StoredGame | null> => {
  const svc = mcpService();
  if (!svc) return null;
  try {
    const res = await svc.fetch(`https://internal/api/games/${code}`);
    if (!res.ok) return null;
    const { game } = (await res.json()) as { game: StoredGame };
    return game;
  } catch {
    return null;
  }
});
