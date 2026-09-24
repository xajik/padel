"use client";

import { useEffect, useState } from "react";
import type { Scoring } from "@padel/engine";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export interface PadTarget {
  matchIndex: number;
  side: "A" | "B";
  teamNames: [string, string];
  current: [number | null, number | null];
}

/**
 * Score entry sheet (FR-2.2). Total points: one tap on a number fills both sides.
 * Other scoring types: pick each side, then save.
 */
export function ScorePad({
  target,
  scoring,
  onClose,
  onSubmit,
}: {
  target: PadTarget | null;
  scoring: Scoring;
  onClose: () => void;
  onSubmit: (matchIndex: number, a: number | null, b: number | null) => void;
}) {
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);
  const [side, setSide] = useState<"A" | "B">("A");

  useEffect(() => {
    if (!target) return;
    setA(target.current[0]);
    setB(target.current[1]);
    setSide(target.side);
  }, [target]);

  if (!target) return null;
  const total = scoring.type === "total" ? (scoring.points ?? 24) : null;
  const max = scoring.type === "first_to" || scoring.type === "total" ? (scoring.points ?? 24) : 40;
  const numbers = Array.from({ length: max + 1 }, (_, i) => i);

  const pick = (n: number) => {
    if (total !== null) {
      const [sa, sb] = side === "A" ? [n, total - n] : [total - n, n];
      onSubmit(target.matchIndex, sa, sb);
      return;
    }
    if (side === "A") {
      setA(n);
      setSide("B");
    } else setB(n);
  };

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto w-full max-w-md px-4 pb-4">
          <DrawerHeader className="px-0">
            <DrawerTitle>{total !== null ? `Points for ${target.teamNames[side === "A" ? 0 : 1]}` : "Enter the score"}</DrawerTitle>
            <DrawerDescription>
              {total !== null ? `The other team gets the rest of ${total}.` : scoring.type === "first_to" ? `First to ${max}.` : "Points for each team."}
            </DrawerDescription>
          </DrawerHeader>

          {total === null && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(["A", "B"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={cn(
                    "rounded-xl border p-3 text-left",
                    side === s ? "border-foreground ring-1 ring-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="block truncate text-xs">{target.teamNames[s === "A" ? 0 : 1]}</span>
                  <span className="font-mono text-3xl font-semibold tabular-nums">{(s === "A" ? a : b) ?? "–"}</span>
                </button>
              ))}
            </div>
          )}

          <div className="grid max-h-[46vh] grid-cols-5 gap-1.5 overflow-y-auto sm:grid-cols-6">
            {numbers.map((n) => {
              const active = (side === "A" ? a : b) === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => pick(n)}
                  className={cn(
                    "h-12 rounded-lg border font-mono text-lg tabular-nums transition-colors",
                    active ? "border-primary bg-primary text-primary-foreground" : "hover:border-foreground/40",
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="h-11 flex-1" onClick={() => onSubmit(target.matchIndex, null, null)}>
              Clear
            </Button>
            {total === null && (
              <Button className="h-11 flex-1" disabled={a === null || b === null} onClick={() => onSubmit(target.matchIndex, a, b)}>
                Save
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
