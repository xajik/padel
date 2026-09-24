import { Icon } from "@/components/icons/icon";

/** Static illustration of the round view used on marketing pages. */
export function CourtPreview() {
  const courts = [
    { court: 1, a: ["Anna", "Mikko"], b: ["Laura", "Jussi"], sa: 15, sb: 9 },
    { court: 2, a: ["Sara", "Pekka"], b: ["Emma", "Olli"], sa: 11, sb: 13 },
  ];
  return (
    <div aria-hidden className="w-full max-w-sm rounded-2xl border bg-card p-3 shadow-[0_1px_0_0_var(--border),0_24px_48px_-24px_rgb(0_0_0/0.25)]">
      <div className="flex items-center justify-between px-2 pt-1 pb-3 text-sm">
        <span className="font-medium">Round 3 of 7</span>
        <span className="text-muted-foreground">24 points</span>
      </div>
      <div className="space-y-2">
        {courts.map((c) => (
          <div key={c.court} className="rounded-xl border p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon name="court" size={14} /> Court {c.court}
            </div>
            {[
              [c.a, c.sa, c.sa > c.sb],
              [c.b, c.sb, c.sb > c.sa],
            ].map(([names, score, won], i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className={won ? "font-medium" : "text-muted-foreground"}>{(names as string[]).join(" & ")}</span>
                <span className={`font-mono text-2xl tabular-nums ${won ? "" : "text-muted-foreground"}`}>{score as number}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
        <Icon name="sitout" size={16} /> Sitting out: Aino
      </div>
    </div>
  );
}
