import { isFirebaseConfigured } from "../config";
import { localRepository } from "./local-repo";
import type { GameRepository } from "./types";

export * from "./types";
export * from "./code";

/**
 * Active game store. Firestore (docs/REQUIREMENTS.md §8.3) replaces the local store
 * once Firebase credentials are provided.
 */
export function gameRepository(): GameRepository {
  if (isFirebaseConfigured) {
    // TODO(firebase): return firestoreRepository (games/{id}, rounds, joinCodes) with offline persistence.
  }
  return localRepository;
}
