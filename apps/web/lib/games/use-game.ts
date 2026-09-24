"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nextRound, setScore, swapPlayers } from "@padel/engine";
import { gameRepository } from ".";
import { CloudError, fetchCloudGame, getOrganizerKey, mutateCloud, redeemKey, setOrganizerKey, type CloudMutation } from "./cloud";
import type { StoredGame } from "./types";

export type GameSource = "local" | "cloud";
export type GameLoad =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; game: StoredGame; source: GameSource; cloudEditor: boolean };

const POLL_MS = 4000;

export interface GameOps {
  score(roundIndex: number, matchIndex: number, a: number | null, b: number | null): Promise<number[]>;
  next(): Promise<StoredGame>;
  finish(): Promise<void>;
  reopen(): Promise<void>;
  swap(roundIndex: number, a: string, b: string): Promise<void>;
}

/**
 * Loads a game from this device, or from the cloud store (games created by AI assistants),
 * keeps it fresh (local events / polling) and exposes edit operations for either source.
 */
export function useGame(code: string, initial: StoredGame | null = null, keyFromUrl: string | null = null) {
  const [load, setLoad] = useState<GameLoad>(
    initial ? { status: "ready", game: initial, source: "cloud", cloudEditor: false } : { status: "loading" },
  );
  const sourceRef = useRef<GameSource | null>(initial ? "cloud" : null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    let unsub: (() => void) | undefined;
    let onVisible: (() => void) | undefined;
    const repo = gameRepository();

    async function start() {
      const local = await repo.get(code);
      if (!alive) return;
      if (local) {
        sourceRef.current = "local";
        setLoad({ status: "ready", game: local, source: "local", cloudEditor: false });
        unsub = repo.subscribe(code, (g) => setLoad(g ? { status: "ready", game: g, source: "local", cloudEditor: false } : { status: "missing" }));
        return;
      }

      sourceRef.current = "cloud";
      if (keyFromUrl) setOrganizerKey(code, keyFromUrl);
      const key = getOrganizerKey(code);
      const [game, editor] = await Promise.all([
        initial ? Promise.resolve(initial) : fetchCloudGame(code).catch(() => null),
        key ? redeemKey(code, key).catch(() => false) : Promise.resolve(false),
      ]);
      if (!alive) return;
      if (key && !editor) setOrganizerKey(code, null);
      if (!game) return setLoad({ status: "missing" });
      setLoad({ status: "ready", game, source: "cloud", cloudEditor: editor });

      // Live updates: polling now; Firestore onSnapshot once connected (FR-2.9).
      const refresh = async () => {
        const fresh = await fetchCloudGame(code).catch(() => null);
        if (alive && fresh) {
          setLoad((prev) =>
            prev.status === "ready" && prev.game.updatedAt >= fresh.updatedAt ? prev : { status: "ready", game: fresh, source: "cloud", cloudEditor: editor },
          );
        }
      };
      // Background tabs poll 4× less often; coming back to the tab refreshes at once.
      let tick = 0;
      timer = setInterval(() => {
        tick += 1;
        if (document.visibilityState === "visible" || tick % 4 === 0) void refresh();
      }, POLL_MS);
      onVisible = () => document.visibilityState === "visible" && void refresh();
      document.addEventListener("visibilitychange", onVisible);
    }

    void start();
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      if (onVisible) document.removeEventListener("visibilitychange", onVisible);
      unsub?.();
    };
  }, [code, initial, keyFromUrl]);

  const current = () => (load.status === "ready" ? load.game : null);

  const saveLocal = useCallback(async (game: StoredGame) => {
    const next = { ...game, updatedAt: Date.now() };
    setLoad({ status: "ready", game: next, source: "local", cloudEditor: false });
    await gameRepository().save(next);
    return next;
  }, []);

  const cloud = useCallback(
    async (m: CloudMutation) => {
      const key = getOrganizerKey(code);
      if (!key) throw new CloudError("NOT_EDITOR", "Open the organizer link to edit this game.");
      const res = await mutateCloud(code, key, m);
      setLoad({ status: "ready", game: res.game, source: "cloud", cloudEditor: true });
      return res;
    },
    [code],
  );

  const ops: GameOps = {
    async score(roundIndex, matchIndex, a, b) {
      const g = current();
      if (!g) return [];
      if (sourceRef.current === "cloud") {
        const court = g.state.rounds[roundIndex].matches[matchIndex].court;
        return (await cloud({ type: "score", court, scoreA: a, scoreB: b, round: roundIndex + 1 })).regenerated.map((r) => r - 1);
      }
      const res = setScore(g.state, roundIndex, matchIndex, a, b);
      await saveLocal({ ...g, state: res.state });
      return res.regenerated;
    },
    async next() {
      const g = current()!;
      if (sourceRef.current === "cloud") return (await cloud({ type: "next" })).game;
      return saveLocal({ ...g, state: nextRound(g.state) });
    },
    async finish() {
      const g = current()!;
      if (sourceRef.current === "cloud") await cloud({ type: "finish" });
      else await saveLocal({ ...g, status: "done" });
    },
    async reopen() {
      const g = current()!;
      if (sourceRef.current === "cloud") await cloud({ type: "reopen" });
      else await saveLocal({ ...g, status: "live" });
    },
    async swap(roundIndex, a, b) {
      const g = current()!;
      const state = swapPlayers(g.state, roundIndex, a, b);
      if (sourceRef.current === "cloud") await cloud({ type: "replace", state, status: g.status });
      else await saveLocal({ ...g, state });
    },
  };

  return { load, ops };
}
