import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { modeInfo } from "@padel/engine";
import { JsonLd } from "@/components/app/json-ld";
import { Icon, MODE_ICONS } from "@/components/icons/icon";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { ScheduleTable } from "@/components/marketing/schedule-table";
import { Button } from "@/components/ui/button";
import { exampleSchedule } from "@/lib/content/markdown";
import { MODE_GUIDES, modeGuide } from "@padel/content";
import { SCHEDULE_MODES, scheduleSlug } from "@/lib/schedule";
import { absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ mode: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => MODE_GUIDES.map((g) => ({ mode: g.id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = modeGuide((await params).mode);
  if (!g) return {};
  return {
    title: `${g.title}: rules, scoring and schedule`,
    description: g.answer.slice(0, 155).replace(/\s\S*$/, "") + "…",
    alternates: { canonical: `/modes/${g.id}`, types: { "text/markdown": `/modes/${g.id}.md` } },
    openGraph: { type: "article", url: `/modes/${g.id}` },
  };
}

export default async function ModePage({ params }: Props) {
  const g = modeGuide((await params).mode);
  if (!g) notFound();
  const info = modeInfo(g.id);
  const ex = exampleSchedule(g);
  const newHref = `/new?mode=${g.id}&players=${g.example.players}&courts=${g.example.courts}`;

  return (
    <article className="mx-auto w-full max-w-3xl space-y-10 px-4 py-10">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: `How to play ${g.title}`,
            description: g.answer,
            totalTime: "PT2H",
            step: g.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: g.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: g.title,
            description: g.answer,
            url: absoluteUrl(`/modes/${g.id}`),
            dateModified: "2026-09-24",
            author: { "@type": "Organization", name: "Padel Americano" },
          },
        ]}
      />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Formats", href: "/modes" }, { name: info.name, href: `/modes/${g.id}` }]} />

      <header className="space-y-5">
        <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Icon name={MODE_ICONS[g.id]} size={26} />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{g.title}</h1>
        <p className="text-lg leading-relaxed text-pretty">{g.answer}</p>
        <dl className="grid gap-3 rounded-2xl border p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Players</dt>
            <dd className="font-medium">{g.players}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Best for</dt>
            <dd className="font-medium">{g.bestFor}</dd>
          </div>
        </dl>
        <Button asChild size="lg" className="h-12 gap-2">
          <Link href={newHref}>
            Start a {info.name} <ArrowRight className="size-4" />
          </Link>
        </Button>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How does {info.name} work?</h2>
        <ol className="space-y-3">
          {g.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border font-mono text-xs">{i + 1}</span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">How is {info.name} scored?</h2>
        <p>{g.scoring}</p>
      </section>

      {ex && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Example: {g.example.players} players on {g.example.courts} courts
          </h2>
          <p className="text-muted-foreground">
            {info.dynamic
              ? "Round 1 is drawn at random. Every later round is drawn from the standings, so it depends on the results."
              : `${ex.estimate.rounds} rounds, ${ex.estimate.matches} matches, about ${ex.duration} at 24 points per match.`}
          </p>
          <ScheduleTable state={ex.state} />
          {SCHEDULE_MODES.includes(g.id) && (
            <p className="text-sm">
              <Link className="underline underline-offset-4" href={`/schedule/${g.id}/${scheduleSlug(g.example.players, g.example.courts)}`}>
                More {info.name} schedules for 4–24 players →
              </Link>
            </p>
          )}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Tips</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          {g.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Frequently asked questions</h2>
        <dl className="space-y-5">
          {g.faq.map((f) => (
            <div key={f.q}>
              <dt className="font-medium">{f.q}</dt>
              <dd className="mt-1 text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav aria-label="Other formats" className="border-t pt-6">
        <p className="mb-3 text-sm text-muted-foreground">Other formats</p>
        <div className="flex flex-wrap gap-2">
          {MODE_GUIDES.filter((m) => m.id !== g.id).map((m) => (
            <Link key={m.id} href={`/modes/${m.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm hover:border-foreground/40">
              <Icon name={MODE_ICONS[m.id]} size={14} /> {modeInfo(m.id).name}
            </Link>
          ))}
        </div>
      </nav>
      <p className="text-xs text-muted-foreground">Updated 24 September 2026 · <Link href={`/modes/${g.id}.md`} className="underline">Markdown</Link></p>
    </article>
  );
}
