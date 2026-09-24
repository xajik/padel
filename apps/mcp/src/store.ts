import { DurableObject } from "cloudflare:workers";
import type { GameState } from "@padel/engine";
import { advance, applyScore, publicGame, ToolError, type CloudGame, type PublicGame } from "./game";

/**
 * One Durable Object per join code: an interim cloud game store until the
 * Firestore backend is connected (docs/REQUIREMENTS.md §8.3). Every mutation runs
 * inside the object, so concurrent edits from an agent and a phone are serialised.
 */

const KEY = "game";
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export type Mutation =
  | { type: "score"; court: number; scoreA: number | null; scoreB?: number | null; round?: number }
  | { type: "next" }
  | { type: "finish" }
  | { type: "reopen" }
  | { type: "replace"; state: GameState; status: "live" | "done"; name?: string };

export type MutationResult =
  | { ok: true; game: PublicGame; regenerated: number[] }
  | { ok: false; code: string; message: string };

export class GameRoom extends DurableObject<Env> {
  async create(game: CloudGame): Promise<boolean> {
    if (await this.ctx.storage.get(KEY)) return false;
    await this.ctx.storage.put(KEY, game);
    await this.ctx.storage.setAlarm(Date.now() + RETENTION_MS);
    return true;
  }

  async read(): Promise<PublicGame | null> {
    const g = await this.ctx.storage.get<CloudGame>(KEY);
    return g ? publicGame(g) : null;
  }

  async authorize(keyHash: string): Promise<boolean> {
    const g = await this.ctx.storage.get<CloudGame>(KEY);
    return !!g && g.keyHashes.includes(keyHash);
  }

  async mutate(keyHash: string, m: Mutation): Promise<MutationResult> {
    const g = await this.ctx.storage.get<CloudGame>(KEY);
    if (!g) return { ok: false, code: "NOT_FOUND", message: "No game with that code." };
    if (!g.keyHashes.includes(keyHash)) {
      return { ok: false, code: "NOT_EDITOR", message: "This needs the organizer key for the game. Call join_game with organizerKey." };
    }
    try {
      let next = g;
      let regenerated: number[] = [];
      switch (m.type) {
        case "score": {
          const res = applyScore(g, m.court, m.scoreA, m.scoreB, m.round);
          next = res.game;
          regenerated = res.regenerated;
          break;
        }
        case "next":
          next = advance(g);
          break;
        case "finish":
          next = { ...g, status: "done", updatedAt: Date.now() };
          break;
        case "reopen":
          next = { ...g, status: "live", updatedAt: Date.now() };
          break;
        case "replace":
          if (m.state.players.length !== g.state.players.length || m.state.settings.mode !== g.state.settings.mode) {
            return { ok: false, code: "INVALID_STATE", message: "Players and format cannot change." };
          }
          next = { ...g, state: m.state, status: m.status, name: m.name?.slice(0, 60) || g.name, updatedAt: Date.now() };
          break;
      }
      await this.ctx.storage.put(KEY, next);
      await this.ctx.storage.setAlarm(Date.now() + RETENTION_MS);
      return { ok: true, game: publicGame(next), regenerated };
    } catch (e) {
      if (e instanceof ToolError) return { ok: false, code: e.code, message: e.message };
      throw e;
    }
  }

  /** Guest-game retention (FR-8.2.4): forget inactive games. */
  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}

export function room(env: Env, code: string) {
  return env.GAMES.get(env.GAMES.idFromName(code));
}
