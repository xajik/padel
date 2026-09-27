import { DurableObject } from "cloudflare:workers";
import type { GameState } from "@padel/engine";
import { advance, applyScore, canEdit, publicGame, ToolError, type Actor, type CloudGame, type PublicGame } from "./game";

/**
 * One Durable Object per join code: an interim cloud game store until the
 * Firestore backend is connected (docs/REQUIREMENTS.md §8.3). Every mutation runs
 * inside the object, so concurrent edits from an agent and a phone are serialised.
 */

const KEY = "game";
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
/** Keys issued to an account's devices pile up; keep the newest ones. */
const MAX_KEYS = 32;

export type Mutation =
  | { type: "score"; court: number; scoreA: number | null; scoreB?: number | null; round?: number }
  | { type: "next" }
  | { type: "finish" }
  | { type: "reopen" }
  | { type: "replace"; state: GameState; status: "live" | "done"; name?: string };

export type MutationResult =
  | { ok: true; game: PublicGame; regenerated: number[] }
  | { ok: false; code: string; message: string };

export type Role = "owner" | "editor";

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

  async authorize(actor: Actor): Promise<boolean> {
    const g = await this.ctx.storage.get<CloudGame>(KEY);
    return !!g && canEdit(g, actor);
  }

  /**
   * Checks an organizer key. A signed-in caller with a valid key becomes an editor of the
   * game (FR-8.2 `redeemInvite`), so it shows up in their history on every device.
   */
  async redeem(actor: Actor): Promise<boolean> {
    const g = await this.ctx.storage.get<CloudGame>(KEY);
    if (!g || !canEdit(g, actor)) return false;
    if (actor.uid && g.ownerUid !== actor.uid && !(g.editorUids ?? []).includes(actor.uid)) {
      await this.ctx.storage.put(KEY, { ...g, editorUids: [...(g.editorUids ?? []), actor.uid] });
      await users(this.env, actor.uid).add(g.code, "editor");
    }
    return true;
  }

  /** Stores the hash of a fresh organizer key for an owner or editor (a new device of theirs). */
  async issueKey(uid: string, keyHash: string): Promise<boolean> {
    const g = await this.ctx.storage.get<CloudGame>(KEY);
    if (!g || !canEdit(g, { uid })) return false;
    await this.ctx.storage.put(KEY, { ...g, keyHashes: [...g.keyHashes, keyHash].slice(-MAX_KEYS) });
    return true;
  }

  /** Account merge (FR-3.4): the anonymous UID's rights move to the signed-in UID. */
  async transfer(from: string, to: string): Promise<Role | null> {
    const g = await this.ctx.storage.get<CloudGame>(KEY);
    if (!g) return null;
    const editors = g.editorUids ?? [];
    if (g.ownerUid === from) {
      await this.ctx.storage.put(KEY, { ...g, ownerUid: to, editorUids: editors.filter((u) => u !== to && u !== from) });
      return "owner";
    }
    if (editors.includes(from)) {
      await this.ctx.storage.put(KEY, { ...g, editorUids: [...new Set(editors.map((u) => (u === from ? to : u)))] });
      return "editor";
    }
    return null;
  }

  /** Account deletion (FR-3.7): drop the user's rights; the game stays viewable for the others. */
  async forget(uid: string): Promise<void> {
    const g = await this.ctx.storage.get<CloudGame>(KEY);
    if (!g) return;
    await this.ctx.storage.put(KEY, {
      ...g,
      ownerUid: g.ownerUid === uid ? "deleted" : g.ownerUid,
      editorUids: (g.editorUids ?? []).filter((u) => u !== uid),
    });
  }

  async mutate(actor: Actor, m: Mutation): Promise<MutationResult> {
    const g = await this.ctx.storage.get<CloudGame>(KEY);
    if (!g) return { ok: false, code: "NOT_FOUND", message: "No game with that code." };
    if (!canEdit(g, actor)) {
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

  /** Guest-game retention (FR-8.2.4): forget inactive games, and drop them from account histories. */
  async alarm() {
    const g = await this.ctx.storage.get<CloudGame>(KEY);
    if (g) {
      for (const uid of [g.ownerUid, ...(g.editorUids ?? [])]) {
        if (isAccountUid(uid)) await users(this.env, uid).remove(g.code);
      }
    }
    await this.ctx.storage.deleteAll();
  }
}

export interface UserGameEntry {
  code: string;
  role: Role;
  addedAt: number;
}

/**
 * One Durable Object per Firebase UID: the codes of the games the user owns or edits.
 * The games themselves stay in their GameRoom; this is only the "My games" index.
 */
export class UserGames extends DurableObject<Env> {
  async add(code: string, role: Role): Promise<void> {
    const prev = await this.ctx.storage.get<UserGameEntry>(`g:${code}`);
    if (prev && (prev.role === "owner" || role === "editor")) return;
    await this.ctx.storage.put(`g:${code}`, { code, role, addedAt: prev?.addedAt ?? Date.now() });
  }

  async remove(code: string): Promise<void> {
    await this.ctx.storage.delete(`g:${code}`);
  }

  async entries(): Promise<UserGameEntry[]> {
    const map = await this.ctx.storage.list<UserGameEntry>({ prefix: "g:" });
    return [...map.values()].sort((a, b) => b.addedAt - a.addedAt);
  }

  /** Entries with their current games, newest activity first; games that expired are dropped. */
  async list(): Promise<{ role: Role; game: PublicGame }[]> {
    const out: { role: Role; game: PublicGame }[] = [];
    for (const e of await this.entries()) {
      const game = (await room(this.env, e.code).read()) as PublicGame | null;
      if (game) out.push({ role: e.role, game });
      else await this.remove(e.code);
    }
    return out.sort((a, b) => b.game.updatedAt - a.game.updatedAt);
  }

  async deleteAll(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}

export function room(env: Env, code: string) {
  return env.GAMES.get(env.GAMES.idFromName(code));
}

export function users(env: Env, uid: string) {
  return env.USERS.get(env.USERS.idFromName(uid));
}

/** Pseudo-owners like `mcp:<hash>`, `app` or `deleted` have no index. */
export function isAccountUid(uid: string): boolean {
  return !!uid && !uid.includes(":") && uid !== "app" && uid !== "deleted";
}
