import type { GameState } from "@padel/engine";

export interface StoredGame {
  id: string;
  code: string;
  name: string;
  ownerUid: string;
  status: "live" | "done";
  source: "web" | "mcp" | "app";
  createdAt: number;
  updatedAt: number;
  state: GameState;
}

export interface GameRepository {
  readonly kind: "local" | "firebase";
  create(game: StoredGame): Promise<StoredGame>;
  get(code: string): Promise<StoredGame | null>;
  save(game: StoredGame): Promise<void>;
  remove(code: string): Promise<void>;
  list(): Promise<StoredGame[]>;
  /** Hands a guest's games to the account they signed in to. */
  transferOwnership(fromUid: string, toUid: string): Promise<void>;
  /** Live updates for one game (other tabs now; other devices once Firebase is connected). */
  subscribe(code: string, onChange: (game: StoredGame | null) => void): () => void;
}
