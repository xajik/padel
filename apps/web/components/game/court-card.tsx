"use client";

import type { Match, Scoring } from "@padel/engine";
import { Icon } from "@/components/icons/icon";
import { cn } from "@/lib/utils";

export function CourtCard({
  match,
  names,
  scoring,
  editable,
  swapMode,
  selected,
  onScore,
  onResult,
  onPickPlayer,
}: {
  match: Match;
  names: (id: string) => string;
  scoring: Scoring;
  editable: boolean;
  swapMode?: boolean;
  selected?: string | null;
  onScore: (side: "A" | "B") => void;
  onResult: (a: number, b: number) => void;
  onPickPlayer?: (id: string) => void;
}) {
  const scored = match.scoreA !== null && match.scoreB !== null;
  const aWon = scored && match.scoreA! > match.scoreB!;
  const bWon = scored && match.scoreB! > match.scoreA!;
  const off = scoring.type === "off";

  const row = (side: "A" | "B") => {
    const team = side === "A" ? match.teamA : match.teamB;
    const score = side === "A" ? match.scoreA : match.scoreB;
    const won = side === "A" ? aWon : bWon;
    const lost = scored && !won && (aWon || bWon);
    return (
      <div className="flex items-center gap-3 py-1.5">
        <div className={cn("min-w-0 flex-1 text-[15px] leading-tight", lost && "text-muted-foreground")}>
          {team.map((id, i) => (
            <span key={id}>
              {i > 0 && <span className="text-muted-foreground"> & </span>}
              {swapMode ? (
                <button
                  type="button"
                  onClick={() => onPickPlayer?.(id)}
                  className={cn(
                    "rounded-md border border-dashed px-1.5 py-0.5",
                    selected === id ? "border-solid border-primary bg-primary text-primary-foreground" : "hover:border-foreground",
                  )}
                >
                  {names(id)}
                </button>
              ) : (
                <span className={cn(won && "font-semibold")}>{names(id)}</span>
              )}
            </span>
          ))}
        </div>
        {off ? (
          <button
            type="button"
            disabled={!editable || swapMode}
            onClick={() => onResult(side === "A" ? 1 : 0, side === "A" ? 0 : 1)}
            className={cn(
              "h-11 min-w-20 rounded-lg border px-3 text-sm font-medium",
              won ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-foreground/40",
            )}
          >
            {won ? "Won" : "Winner?"}
          </button>
        ) : (
          <button
            type="button"
            disabled={!editable || swapMode}
            onClick={() => onScore(side)}
            aria-label={`Score for ${team.map(names).join(" and ")}: ${score ?? "not entered"}`}
            className={cn(
              "grid h-14 w-16 place-items-center rounded-xl border font-mono text-3xl font-semibold tabular-nums transition-colors",
              score === null ? "border-dashed text-muted-foreground/60 hover:border-foreground/50" : "hover:border-foreground/40",
              won && "border-primary bg-primary text-primary-foreground",
              lost && "text-muted-foreground",
            )}
          >
            {score ?? "–"}
          </button>
        )}
      </div>
    );
  };

  return (
    <article className="rounded-2xl border bg-card p-4" aria-label={`Court ${match.court}`}>
      <header className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Icon name="court" size={14} /> Court {match.court}
        </span>
        {scored ? <span>Final</span> : <span>In play</span>}
      </header>
      {row("A")}
      <div className="my-1 flex items-center gap-2 text-[11px] tracking-widest text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" /> vs <span className="h-px flex-1 bg-border" />
      </div>
      {row("B")}
      {off && editable && !swapMode && (
        <button type="button" onClick={() => onResult(0, 0)} className="mt-1 text-xs text-muted-foreground underline-offset-4 hover:underline">
          Mark as draw
        </button>
      )}
    </article>
  );
}
