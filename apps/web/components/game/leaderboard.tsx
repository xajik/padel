import type { LeaderboardMode, Standing } from "@padel/engine";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const SCORE_LABEL: Record<LeaderboardMode, string> = { points: "Pts", wins: "Wins", average: "Avg" };

export function Leaderboard({ rows, mode, compact = false }: { rows: Standing[]; mode: LeaderboardMode; compact?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <caption className="sr-only">Leaderboard</caption>
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th scope="col" className="w-12 py-2.5 pl-4 text-left font-medium">#</th>
            <th scope="col" className="py-2.5 text-left font-medium">Player</th>
            <th scope="col" className="px-2 py-2.5 text-right font-medium">{SCORE_LABEL[mode]}</th>
            {!compact && (
              <>
                <th scope="col" className="hidden px-2 py-2.5 text-right font-medium sm:table-cell">W-D-L</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium">+/−</th>
                <th scope="col" className="py-2.5 pr-4 text-right font-medium">P</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-3 pl-4 font-mono tabular-nums">
                <span className="inline-flex items-center gap-1">
                  {r.rank}
                  <Movement value={r.movement} />
                </span>
              </td>
              <td className={cn("py-3 pr-2", r.rank === 1 && "font-semibold")}>{r.name}</td>
              <td className="px-2 py-3 text-right font-mono text-base font-semibold tabular-nums">{r.score}</td>
              {!compact && (
                <>
                  <td className="hidden px-2 py-3 text-right font-mono text-muted-foreground tabular-nums sm:table-cell">
                    {r.wins}-{r.draws}-{r.losses}
                  </td>
                  <td className="px-2 py-3 text-right font-mono text-muted-foreground tabular-nums">
                    {r.diff > 0 ? `+${r.diff}` : r.diff}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-muted-foreground tabular-nums">{r.played}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Rank change since last round. Colour is functional and always paired with an icon + label. */
function Movement({ value }: { value: number }) {
  if (!value) return null;
  const up = value > 0;
  return (
    <span
      className={cn("inline-flex items-center text-[11px]", up ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}
      aria-label={`${up ? "up" : "down"} ${Math.abs(value)}`}
    >
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(value)}
    </span>
  );
}
