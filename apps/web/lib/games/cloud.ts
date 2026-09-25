"use client";

import type { GameState } from "@padel/engine";
import type { StoredGame } from "./types";

/**
 * Client for cloud games (created by AI assistants through the MCP server).
 * Interim backend: the apps/mcp Worker's Durable Objects, until Firestore is connected.
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

export async function fetchCloudGame(code: string): Promise<StoredGame | null> {
  const res = await fetch(`/api/games/${code}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new CloudError("NETWORK", "Could not reach the game server.");
  return ((await res.json()) as { game: StoredGame }).game;
}

export async function redeemKey(code: string, key: string): Promise<boolean> {
  const res = await fetch(`/api/games/${code}/redeem`, { method: "POST", headers: { "X-Organizer-Key": key } });
  if (!res.ok) return false;
  return ((await res.json()) as { editor: boolean }).editor;
}

export async function mutateCloud(code: string, key: string, m: CloudMutation): Promise<{ game: StoredGame; regenerated: number[] }> {
  const res = await fetch(`/api/games/${code}/mutate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Organizer-Key": key },
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
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
