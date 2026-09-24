import type { GameRepository, StoredGame } from "./types";

const KEY = "padel:games:v1";
const EVENT = "padel:games-changed";

function readAll(): Record<string, StoredGame> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeAll(games: Record<string, StoredGame>) {
  localStorage.setItem(KEY, JSON.stringify(games));
  window.dispatchEvent(new Event(EVENT));
}

/** Device-local store used until Firebase credentials are configured. Works offline. */
export const localRepository: GameRepository = {
  kind: "local",
  async create(game) {
    const all = readAll();
    all[game.code] = game;
    writeAll(all);
    return game;
  },
  async get(code) {
    return readAll()[code] ?? null;
  },
  async save(game) {
    const all = readAll();
    all[game.code] = { ...game, updatedAt: Date.now() };
    writeAll(all);
  },
  async remove(code) {
    const all = readAll();
    delete all[code];
    writeAll(all);
  },
  async list() {
    return Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async transferOwnership(fromUid, toUid) {
    const all = readAll();
    let changed = false;
    for (const game of Object.values(all)) {
      if (game.ownerUid === fromUid) {
        game.ownerUid = toUid;
        changed = true;
      }
    }
    if (changed) writeAll(all);
  },
  subscribe(code, onChange) {
    const handler = () => onChange(readAll()[code] ?? null);
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  },
};
