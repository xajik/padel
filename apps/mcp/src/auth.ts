import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

/**
 * Firebase Auth ID-token verification (no Admin SDK): Google's securetoken JWKS,
 * issuer `https://securetoken.google.com/<projectId>` and audience `<projectId>`.
 * Web, iOS and Android send the token as `Authorization: Bearer <idToken>`.
 */

export interface Identity {
  uid: string;
  anonymous: boolean;
  name?: string;
  email?: string;
}

const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let jwks: JWTVerifyGetKey | null = null;
/** Tests swap in a local key set. */
export function setKeySet(keys: JWTVerifyGetKey | null) {
  jwks = keys;
}

export async function verifyIdToken(token: string, projectId: string): Promise<Identity | null> {
  if (!projectId || !isJwt(token)) return null;
  jwks ??= createRemoteJWKSet(new URL(JWKS_URL));
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    });
    const uid = payload.sub;
    if (!uid || uid.length > 128) return null;
    const firebase = payload.firebase as { sign_in_provider?: string } | undefined;
    return {
      uid,
      anonymous: firebase?.sign_in_provider === "anonymous",
      name: typeof payload.name === "string" ? payload.name : undefined,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };
  } catch {
    return null;
  }
}

/** A JWT has three base64url segments; organizer keys never contain a dot. */
export function isJwt(token: string): boolean {
  return /^[\w-]+\.[\w-]+\.[\w-]+$/.test(token);
}

export function bearer(req: Request): string | null {
  return (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
}

/** The signed-in (or anonymous Firebase) user behind a request, if it carries a valid ID token. */
export async function identity(req: Request, env: Env): Promise<Identity | null> {
  const token = bearer(req);
  return token && isJwt(token) ? verifyIdToken(token, env.FIREBASE_PROJECT_ID) : null;
}
