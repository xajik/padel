import type { Metadata } from "next";
import Link from "next/link";
import { modeInfo } from "@padel/engine";
import { Icon, MODE_ICONS } from "@/components/icons/icon";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MODE_GUIDES } from "@/lib/content/modes";

export const metadata: Metadata = {
  title: "Padel formats compared: Americano, Mexicano, Mixicano and more",
  description:
    "Compare 8 social padel formats: Americano, Team Americano, Mexicano, Team Mexicano, Mixicano, Beat the Box, Up & Down and Team Up & Down. Rules, player counts and when to use each.",
  alternates: { canonical: "/modes" },
};

export default function ModesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Formats", href: "/modes" }]} />
      <header className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Padel formats compared</h1>
        <p className="text-lg text-muted-foreground">
          Americano rotates partners on a fixed schedule. Mexicano pairs players by the leaderboard. Team variants keep partners fixed, and ladder formats move winners up a court.
        </p>
      </header>
      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">Format</th>
              <th scope="col" className="px-3 py-3 font-medium">Partners</th>
              <th scope="col" className="px-3 py-3 font-medium">Pairing</th>
              <th scope="col" className="px-3 py-3 font-medium">Players</th>
              <th scope="col" className="px-3 py-3 font-medium">Best for</th>
            </tr>
          </thead>
          <tbody>
            {MODE_GUIDES.map((g) => {
              const info = modeInfo(g.id);
              return (
                <tr key={g.id} className="border-b align-top last:border-0">
                  <th scope="row" className="px-4 py-3 text-left">
                    <Link href={`/modes/${g.id}`} className="flex items-center gap-2 font-medium hover:underline">
                      <Icon name={MODE_ICONS[g.id]} size={18} /> {info.name}
                    </Link>
                  </th>
                  <td className="px-3 py-3">{info.teams ? "Fixed pairs" : info.sides ? "Rotate, one per side" : "Rotate"}</td>
                  <td className="px-3 py-3">{info.dynamic ? "By results" : "Fixed schedule"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{g.players}</td>
                  <td className="px-3 py-3 text-muted-foreground">{g.bestFor}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
