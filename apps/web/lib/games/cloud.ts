"use client";

import type { GameState, ModeId } from "@padel/engine";
import { isFirebaseConfigured } from "@/lib/config";
import type { StoredGame } from "./types";

/**
 * Client for cloud games (shared from a device, the native apps or AI assistants).
 * Interim backend: the apps/mcp Worker's Durable Objects, until Firestore is connected.
 * Requests carry the Firebase ID token, so games land in the user's account and the
 * owner can edit them on any device without the organizer key.
 */

export type CloudMutation =
  | { type: "score"; court: number; scoreA: number | null; scoreB?: number | null; round?: number }
  | { type: "next" }
  | { type: "finish" }
  | { type: "reopen" }
  | { type: "replace"; state: GameState; status: "live" | "done"; name?: string };

export class CloudError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const KEYS = "padel:organizer-keys:v1";

export function getOrganizerKey(code: string): string | null {
  try {
    return (JSON.parse(localStorage.getItem(KEYS) ?? "{}") as Record<string, string>)[code] ?? null;
  } catch {
    return null;
  }
}

export function setOrganizerKey(code: string, key: string | null) {
  try {
    const all = JSON.parse(localStorage.getItem(KEYS) ?? "{}") as Record<string, string>;
    if (key) all[code] = key;
    else delete all[code];
    localStorage.setItem(KEYS, JSON.stringify(all));
  } catch {}
}

/** `Authorization: Bearer <idToken>` for the current Firebase user (anonymous too), if any. */
export async function authHeaders(): Promise<Record<string, string>> {
  if (!isFirebaseConfigured) return {};
  try {
    const token = await (await import("@/lib/firebase-auth")).idToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function editorHeaders(key: string | null, auth: Record<string, string>): Record<string, string> {
  return key ? { ...auth, "X-Organizer-Key": key } : auth;
}

export async function fetchCloudGame(code: string): Promise<StoredGame | null> {
  const res = await fetch(`/api/games/${code}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new CloudError("NETWORK", "Could not reach the game server.");
  return ((await res.json()) as { game: StoredGame }).game;
}

/** Whether this browser may edit: by organizer key, or because the signed-in user owns or edits the game. */
export async function redeemKey(code: string, key: string | null): Promise<boolean> {
  const auth = await authHeaders();
  if (!key && !auth.Authorization) return false;
  const res = await fetch(`/api/games/${code}/redeem`, { method: "POST", headers: editorHeaders(key, auth) });
  if (!res.ok) return false;
  return ((await res.json()) as { editor: boolean }).editor;
}

export async function mutateCloud(code: string, key: string | null, m: CloudMutation): Promise<{ game: StoredGame; regenerated: number[] }> {
  const res = await fetch(`/api/games/${code}/mutate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...editorHeaders(key, await authHeaders()) },
    body: JSON.stringify(m),
  });
  const body = (await res.json()) as { game: StoredGame; regenerated: number[] } | { error: { code: string; message: string } };
  if ("error" in body) throw new CloudError(body.error.code, body.error.message);
  return body;
}

/**
 * Moves a game that lives only on this device to the cloud game store, so other phones, the native
 * apps (QR / link) and the web can follow it live. The server allocates a new code; our schedule and
 * scores are kept with a `replace`. The organizer key stays on this device.
 */
export async function publishGame(game: StoredGame): Promise<string> {
  const { state } = game;
  const res = await fetch("/api/v1/games", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({
      source: "web",
      mode: state.settings.mode,
      names: state.players.map((p) => p.name),
      courts: state.settings.courts,
      name: game.name,
      ...(state.players.some((p) => p.side) ? { sides: state.players.map((p) => p.side ?? "A") } : {}),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { code?: string; organizerKey?: string; error?: { code: string; message: string } };
  if (!res.ok || !body.code || !body.organizerKey) {
    throw new CloudError(body.error?.code ?? "NETWORK", body.error?.message ?? "Could not reach the game server.");
  }
  await mutateCloud(body.code, body.organizerKey, { type: "replace", state, status: game.status, name: game.name });
  setOrganizerKey(body.code, body.organizerKey);
  return body.code;
}

/** A game in the signed-in user's account (GET /api/me/games). */
export interface AccountGame {
  code: string;
  name: string;
  role: "owner" | "editor";
  status: "live" | "done";
  mode: ModeId;
  modeName: string;
  players: string[];
  currentRound: number;
  updatedAt: number;
}

/** Games in the user's account, from any device or assistant. Empty when signed out or offline. */
export async function fetchAccountGames(): Promise<AccountGame[]> {
  const auth = await authHeaders();
  if (!auth.Authorization) return [];
  try {
    const res = await fetch("/api/me/games", { headers: auth, cache: "no-store" });
    if (!res.ok) return [];
    return ((await res.json()) as { games: AccountGame[] }).games;
  } catch {
    return [];
  }
}
