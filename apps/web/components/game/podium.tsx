import type { Standing } from "@padel/engine";
import { Icon } from "@/components/icons/icon";
import { cn } from "@/lib/utils";

/** Final top three (FR-2.11). Monochrome, one tasteful moment. */
export function Podium({ rows }: { rows: Standing[] }) {
  const top = rows.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const height = (s: Standing) => (s === top[0] ? "h-28" : s === top[1] ? "h-20" : "h-14");
  return (
    <div className="rounded-2xl border bg-card px-4 pt-6 pb-0">
      <div className="mb-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Icon name="podium" size={18} /> Final results
      </div>
      <div className="flex items-end justify-center gap-2">
        {order.map((s) => (
          <div key={s.id} className="flex w-28 flex-col items-center gap-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <span className={cn("text-center text-sm leading-tight", s === top[0] && "text-base font-semibold")}>{s.name}</span>
            <span className="font-mono text-sm text-muted-foreground tabular-nums">{s.score}</span>
            <div
              className={cn(
                "grid w-full place-items-center rounded-t-xl font-mono text-2xl font-semibold",
                height(s),
                s === top[0] ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {s.rank}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
