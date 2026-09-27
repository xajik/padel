import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { verifyIdToken } from "./auth";

/**
 * Sign-in for the account MCP endpoint (/mcp/account). workers-oauth-provider runs the OAuth
 * server (metadata, client registration, tokens); we only handle the authorize step:
 *
 *   GET  /oauth/authorize        parse the client's request, park it under a one-time `state`,
 *                                send the browser to the website's /connect page
 *   GET  /oauth/request?state=   what /connect shows on its consent screen
 *   POST /oauth/callback         { state, idToken } after Google/Apple sign-in → { redirectTo }
 *                                { state, deny: true }                        → { redirectTo }
 *
 * The user is whoever the Firebase ID token says; anonymous sessions are refused.
 */

export interface AccountProps {
  uid: string;
  name?: string;
}

const PENDING_TTL = 600;

interface Pending {
  request: AuthRequest;
  clientName: string;
}

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const fail = (code: string, message: string, status = 400) => json({ error: { code, message } }, status);

function oauth(env: Env): OAuthHelpers {
  return (env as Env & { OAUTH_PROVIDER: OAuthHelpers }).OAUTH_PROVIDER;
}

function newState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function pending(env: Env, state: string | null): Promise<Pending | null> {
  if (!state || !/^[\w-]{16,64}$/.test(state)) return null;
  return env.OAUTH_KV.get<Pending>(`authreq:${state}`, "json");
}

export async function handleOAuth(req: Request, env: Env, path: string): Promise<Response> {
  if (path === "/oauth/authorize" && req.method === "GET") {
    let request: AuthRequest;
    try {
      request = await oauth(env).parseAuthRequest(req);
    } catch (e) {
      return new Response(`Invalid authorization request: ${(e as Error).message}`, { status: 400 });
    }
    const client = await oauth(env).lookupClient(request.clientId);
    if (!client) return new Response("Unknown OAuth client.", { status: 400 });
    const state = newState();
    const value: Pending = { request, clientName: client.clientName?.slice(0, 80) || "An AI assistant" };
    await env.OAUTH_KV.put(`authreq:${state}`, JSON.stringify(value), { expirationTtl: PENDING_TTL });
    return Response.redirect(`${env.SITE_URL}/connect?state=${state}`, 302);
  }

  if (path === "/oauth/request" && req.method === "GET") {
    const p = await pending(env, new URL(req.url).searchParams.get("state"));
    if (!p) return fail("EXPIRED", "This sign-in link has expired. Start again from your assistant.", 404);
    return json({ clientName: p.clientName, redirectHost: new URL(p.request.redirectUri).host });
  }

  if (path === "/oauth/callback" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { state?: string; idToken?: string; deny?: boolean };
    const p = await pending(env, body.state ?? null);
    if (!p) return fail("EXPIRED", "This sign-in link has expired. Start again from your assistant.", 404);

    if (body.deny) {
      await env.OAUTH_KV.delete(`authreq:${body.state}`);
      const url = new URL(p.request.redirectUri);
      url.searchParams.set("error", "access_denied");
      if (p.request.state) url.searchParams.set("state", p.request.state);
      if (p.request.issuer) url.searchParams.set("iss", p.request.issuer);
      return json({ redirectTo: url.toString() });
    }

    const user = body.idToken ? await verifyIdToken(body.idToken, env.FIREBASE_PROJECT_ID) : null;
    if (!user) return fail("UNAUTHORIZED", "Sign-in failed. Try again.", 401);
    if (user.anonymous) return fail("ANONYMOUS", "Sign in with Google or Apple to connect your account.", 403);

    await env.OAUTH_KV.delete(`authreq:${body.state}`);
    const props: AccountProps = { uid: user.uid, name: user.name };
    const { redirectTo } = await oauth(env).completeAuthorization({
      request: p.request,
      userId: user.uid,
      metadata: { clientName: p.clientName },
      scope: p.request.scope,
      props,
    });
    return json({ redirectTo });
  }

  return new Response("Not found", { status: 404 });
}
