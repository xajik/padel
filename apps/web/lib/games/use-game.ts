"use client";

import { useCallback, useEffect, useState } from "react";
import { gameRepository } from ".";
import type { StoredGame } from "./types";

export type GameLoad = { status: "loading" } | { status: "missing" } | { status: "ready"; game: StoredGame };

/** Load + live-subscribe to a game, with an optimistic save helper. */
export function useGame(code: string) {
  const [load, setLoad] = useState<GameLoad>({ status: "loading" });

  useEffect(() => {
    const repo = gameRepository();
    let alive = true;
    void repo.get(code).then((g) => alive && setLoad(g ? { status: "ready", game: g } : { status: "missing" }));
    const unsub = repo.subscribe(code, (g) => setLoad(g ? { status: "ready", game: g } : { status: "missing" }));
    return () => {
      alive = false;
      unsub();
    };
  }, [code]);

  const save = useCallback(async (game: StoredGame) => {
    setLoad({ status: "ready", game });
    await gameRepository().save(game);
  }, []);

  return { load, save };
}
