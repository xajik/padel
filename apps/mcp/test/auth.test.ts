import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type CryptoKey } from "jose";
import { isJwt, setKeySet, verifyIdToken } from "../src/auth";
import { canEdit, prepareGame, type CloudGame } from "../src/game";

const PROJECT = "padel-test";
let privateKey: CryptoKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256" };
  setKeySet(createLocalJWKSet({ keys: [jwk] }));
});
afterAll(() => setKeySet(null));

function token(claims: Record<string, unknown> = {}, opts: { iss?: string; aud?: string; exp?: string } = {}) {
  return new SignJWT({ firebase: { sign_in_provider: "google.com" }, name: "Anna", ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setSubject("uid-123")
    .setIssuer(opts.iss ?? `https://securetoken.google.com/${PROJECT}`)
    .setAudience(opts.aud ?? PROJECT)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? "1h")
    .sign(privateKey);
}

describe("verifyIdToken", () => {
  it("accepts a valid Firebase token", async () => {
    expect(await verifyIdToken(await token(), PROJECT)).toEqual({ uid: "uid-123", anonymous: false, name: "Anna", email: undefined });
  });

  it("flags anonymous sessions", async () => {
    const id = await verifyIdToken(await token({ firebase: { sign_in_provider: "anonymous" } }), PROJECT);
    expect(id?.anonymous).toBe(true);
  });

  it("rejects the wrong audience, issuer or an expired token", async () => {
    expect(await verifyIdToken(await token({}, { aud: "other" }), PROJECT)).toBeNull();
    expect(await verifyIdToken(await token({}, { iss: "https://evil.example" }), PROJECT)).toBeNull();
    expect(await verifyIdToken(await token({}, { exp: "-1m" }), PROJECT)).toBeNull();
  });

  it("rejects garbage and organizer keys", async () => {
    expect(await verifyIdToken("not-a-token", PROJECT)).toBeNull();
    expect(await verifyIdToken("a.b.c", PROJECT)).toBeNull();
  });
});

describe("isJwt", () => {
  it("tells ID tokens from organizer keys", async () => {
    expect(isJwt(await token())).toBe(true);
    expect(isJwt("q7K2mX9vT3pLwR8sYd1fZg")).toBe(false);
  });
});

describe("canEdit", () => {
  const { state } = prepareGame({ mode: "americano", names: ["A", "B", "C", "D"], courts: 1 });
  const g: CloudGame = {
    id: "1", code: "ABCDEF", name: "T", ownerUid: "owner", status: "live", source: "app",
    createdAt: 0, updatedAt: 0, state, keyHashes: ["h1"], editorUids: ["ed"],
  };

  it("allows a matching key, the owner and editors", () => {
    expect(canEdit(g, { keyHash: "h1" })).toBe(true);
    expect(canEdit(g, { uid: "owner" })).toBe(true);
    expect(canEdit(g, { uid: "ed" })).toBe(true);
  });

  it("refuses everyone else", () => {
    expect(canEdit(g, {})).toBe(false);
    expect(canEdit(g, { keyHash: "h2", uid: "stranger" })).toBe(false);
    expect(canEdit({ ...g, editorUids: undefined }, { uid: "ed" })).toBe(false);
  });
});
