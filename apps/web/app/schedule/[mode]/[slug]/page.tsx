import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { maxCourts, modeInfo, type ModeId } from "@padel/engine";
import { JsonLd } from "@/components/app/json-ld";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { ScheduleTable } from "@/components/marketing/schedule-table";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/marketing/print-button";
import { scheduleSummary, scheduleTitle } from "@/lib/content/markdown";
import { buildSchedule, isModeId, nameOf, parseScheduleSlug, scheduleCombos, scheduleSlug, SCHEDULE_MODES } from "@/lib/schedule";
import { absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ mode: string; slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => scheduleCombos().map((c) => ({ mode: c.mode, slug: scheduleSlug(c.players, c.courts) }));

async function load(params: Props["params"]) {
  const { mode, slug } = await params;
  const parsed = parseScheduleSlug(slug);
  if (!parsed || !isModeId(mode) || !SCHEDULE_MODES.includes(mode)) return null;
  try {
    return buildSchedule({ mode, ...parsed });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await load(params);
  if (!r) return {};
  const path = `/schedule/${r.request.mode}/${scheduleSlug(r.request.players, r.request.courts)}`;
  return {
    title: scheduleTitle(r),
    description: scheduleSummary(r),
    alternates: { canonical: path, types: { "text/markdown": `${path}.md` } },
  };
}

export default async function SchedulePage({ params }: Props) {
  const r = await load(params);
  if (!r) notFound();
  const { mode, players, courts } = r.request;
  const info = modeInfo(mode);
  const path = `/schedule/${mode}/${scheduleSlug(players, courts)}`;
  const neighbours = [players - 1, players + 1, players + 2]
    .filter((n) => n >= 4 && n <= 24 && (!info.teams || n % 2 === 0))
    .map((n) => ({ n, c: Math.min(courts, maxCourts(n)) }));

  return (
    <article className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: scheduleTitle(r),
          description: scheduleSummary(r),
          url: absoluteUrl(path),
          totalTime: `PT${Math.round(r.estimate.minutes)}M`,
          step: r.state.rounds.map((round) => ({
            "@type": "HowToStep",
            position: round.index + 1,
            name: `Round ${round.index + 1}`,
            text: round.matches
              .map((m) => `Court ${m.court}: ${m.teamA.map((id) => nameOf(r.state, id)).join(" & ")} vs ${m.teamB.map((id) => nameOf(r.state, id)).join(" & ")}`)
              .join("; "),
          })),
        }}
      />
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Schedules", href: "/schedule" },
          { name: `${players} players, ${courts} court${courts > 1 ? "s" : ""}`, href: path },
        ]}
      />
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{scheduleTitle(r)}</h1>
        <p className="text-lg text-pretty">{scheduleSummary(r)}</p>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button asChild size="lg" className="h-12 gap-2">
            <Link href={`/new?mode=${mode}&players=${players}&courts=${courts}`}>
              Play this with live scoring <ArrowRight className="size-4" />
            </Link>
          </Button>
          <PrintButton />
        </div>
      </header>

      <ScheduleTable state={r.state} />

      <section className="grid gap-3 text-sm sm:grid-cols-4">
        {[
          ["Rounds", r.estimate.rounds],
          ["Matches", r.estimate.matches],
          ["Per player", r.estimate.perPlayerMin === r.estimate.perPlayerMax ? r.estimate.perPlayerMax : `${r.estimate.perPlayerMin}–${r.estimate.perPlayerMax}`],
          ["Duration", `~${r.duration}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border p-4">
            <p className="text-muted-foreground">{k}</p>
            <p className="font-mono text-2xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </section>

      <section className="space-y-2 text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">About this schedule</h2>
        <p>
          {info.teams
            ? "Pairs are fixed. Every pair meets as many different opponents as possible, and pairs sit out in turn."
            : "Partners rotate so everyone plays with as many different people as possible. Sit-outs are spread evenly and never back to back when it can be avoided."}{" "}
          Replace “Player 1…” with your names in the app, or <Link href={`/modes/${mode}`} className="underline underline-offset-4">read the {info.name} rules</Link>.
        </p>
      </section>

      <nav aria-label="Related schedules" className="border-t pt-6 print:hidden">
        <p className="mb-3 text-sm text-muted-foreground">Related schedules</p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: maxCourts(players) }, (_, i) => i + 1)
            .filter((c) => c !== courts)
            .map((c) => ({ n: players, c }))
            .concat(neighbours)
            .map(({ n, c }) => (
              <Link key={`${n}-${c}`} href={`/schedule/${mode}/${scheduleSlug(n, c)}`} className="inline-flex h-9 items-center rounded-full border px-3 text-sm hover:border-foreground/40">
                {n} players · {c} court{c > 1 ? "s" : ""}
              </Link>
            ))}
          {SCHEDULE_MODES.filter((m) => m !== mode && (!modeInfo(m as ModeId).teams || players % 2 === 0)).map((m) => (
            <Link key={m} href={`/schedule/${m}/${scheduleSlug(players, courts)}`} className="inline-flex h-9 items-center rounded-full border px-3 text-sm hover:border-foreground/40">
              {modeInfo(m).name}
            </Link>
          ))}
        </div>
      </nav>
    </article>
  );
}

