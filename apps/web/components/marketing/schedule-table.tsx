import type { GameState } from "@padel/engine";
import { nameOf } from "@/lib/schedule";

/** Round-by-round schedule as a real <table> (crawlable, printable, quotable). */
export function ScheduleTable({ state }: { state: GameState }) {
  const n = (id: string) => nameOf(state, id);
  const courts = state.settings.courts;
  const hasByes = state.rounds.some((r) => r.byes.length);
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-medium">Round</th>
            {Array.from({ length: courts }, (_, i) => (
              <th key={i} scope="col" className="px-3 py-2.5 font-medium">
                Court {i + 1}
              </th>
            ))}
            {hasByes && <th scope="col" className="px-3 py-2.5 font-medium">Sitting out</th>}
          </tr>
        </thead>
        <tbody>
          {state.rounds.map((r) => (
            <tr key={r.index} className="border-b align-top last:border-0">
              <th scope="row" className="px-4 py-3 text-left font-mono font-medium tabular-nums">
                {r.index + 1}
              </th>
              {r.matches.map((m) => (
                <td key={m.court} className="px-3 py-3">
                  <span className="block">{m.teamA.map(n).join(" & ")}</span>
                  <span className="block text-xs text-muted-foreground">vs</span>
                  <span className="block">{m.teamB.map(n).join(" & ")}</span>
                </td>
              ))}
              {hasByes && <td className="px-3 py-3 text-muted-foreground">{r.byes.map(n).join(", ") || "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
