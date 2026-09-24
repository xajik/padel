import type { Metadata } from "next";
import Link from "next/link";
import { maxCourts, modeInfo } from "@padel/engine";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { SCHEDULE_MODES, scheduleCombos, scheduleSlug } from "@/lib/schedule";

export const metadata: Metadata = {
  title: "Padel Americano schedules for 4–24 players",
  description:
    "Free printable padel Americano and Team Americano schedules for 4 to 24 players on 1 to 6 courts, with fair partner rotation and sit-outs.",
  alternates: { canonical: "/schedule" },
};

export default function ScheduleIndex() {
  const combos = scheduleCombos();
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Schedules", href: "/schedule" }]} />
      <header className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Americano schedules</h1>
        <p className="text-lg text-muted-foreground">
          Pick your player count and courts to get a round-by-round schedule with fair partner rotation and sit-outs. Print it or play it with live scoring.
        </p>
      </header>
      {SCHEDULE_MODES.map((mode) => (
        <section key={mode} className="space-y-3">
          <h2 className="text-xl font-semibold">{modeInfo(mode).name}</h2>
          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-medium">Players</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Courts</th>
                </tr>
              </thead>
              <tbody>
                {[...new Set(combos.filter((c) => c.mode === mode).map((c) => c.players))].map((n) => (
                  <tr key={n} className="border-b last:border-0">
                    <th scope="row" className="px-4 py-2 text-left font-mono font-medium tabular-nums">{n}</th>
                    <td className="flex flex-wrap gap-1.5 px-3 py-2">
                      {Array.from({ length: maxCourts(n) }, (_, i) => i + 1).map((c) => (
                        <Link key={c} href={`/schedule/${mode}/${scheduleSlug(n, c)}`} className="inline-flex h-8 items-center rounded-md border px-2.5 hover:border-foreground/40">
                          {c} court{c > 1 ? "s" : ""}
                        </Link>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
