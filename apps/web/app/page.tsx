import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MODES } from "@padel/engine";
import { JoinForm } from "@/components/app/join-form";
import { JsonLd } from "@/components/app/json-ld";
import { RecentGames } from "@/components/app/recent-games";
import { Icon } from "@/components/icons/icon";
import { CourtPreview } from "@/components/marketing/court-preview";
import { ModeCard } from "@/components/marketing/mode-card";
import { Button } from "@/components/ui/button";
import { SITE, absoluteUrl } from "@/lib/site";

const FAQ = [
  {
    q: "What is a padel Americano?",
    a: "A social padel format where partners rotate every round. Each match is played to a fixed number of points, every player keeps the points their team scored, and the highest total wins.",
  },
  {
    q: "Do I need an account?",
    a: "No. Create and run a game as a guest. Signing in with Google (coming soon) will add history, saved groups and playing again with one tap.",
  },
  {
    q: "What if we have an odd number of players?",
    a: "Sit-outs rotate fairly: nobody sits out twice before everyone has sat out once, and never twice in a row when it can be avoided.",
  },
  {
    q: "Can my AI assistant set up the game?",
    a: "Yes. Connect Claude, ChatGPT or another MCP client to our server and say “set up an Americano for these 8 players on 2 courts”.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: SITE.name,
            url: SITE.url,
            description: SITE.description,
            applicationCategory: "SportsApplication",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />

      <section className="border-b">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-12 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <Icon name="ball" size={14} /> Americano · Mexicano · 6 more formats
            </p>
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl">
              Run a fair padel Americano in 30&nbsp;seconds.
            </h1>
            <p className="max-w-md text-lg text-pretty text-muted-foreground">
              Add players, pick courts and points. We rotate partners, keep score and show a live leaderboard. No sign-up.
            </p>
            <div className="flex flex-col gap-4">
              <Button asChild size="lg" className="h-12 w-full max-w-sm gap-2 text-base sm:w-auto sm:self-start">
                <Link href="/new">
                  Create game <ArrowRight className="size-4" />
                </Link>
              </Button>
              <JoinForm />
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <CourtPreview />
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl space-y-16 px-4 py-12">
        <RecentGames />

        <section aria-labelledby="how" className="space-y-6">
          <h2 id="how" className="text-2xl font-semibold tracking-tight">
            How it works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: "group" as const, t: "Add players", d: "Type names or just a count. 4 to 24 players, 1 to 6 courts." },
              { icon: "rotate" as const, t: "Pick a format", d: "Americano, Mexicano, team and ladder formats. Smart defaults." },
              { icon: "leaderboard" as const, t: "Play & score", d: "Enter scores in two taps. The leaderboard updates instantly." },
            ].map((s, i) => (
              <li key={s.t} className="rounded-xl border p-5">
                <div className="mb-4 flex items-center justify-between">
                  <Icon name={s.icon} size={22} />
                  <span className="font-mono text-sm text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="font-medium">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="formats" className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <h2 id="formats" className="text-2xl font-semibold tracking-tight">
              Every popular format
            </h2>
            <Link href="/modes" className="text-sm text-muted-foreground hover:text-foreground">
              Compare formats →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MODES.map((m) => (
              <ModeCard key={m.id} mode={m} href={`/modes/${m.id}`} />
            ))}
          </div>
        </section>

        <section aria-labelledby="agents" className="grid items-center gap-6 rounded-2xl bg-primary p-6 text-primary-foreground sm:grid-cols-[auto_1fr_auto] sm:p-8">
          <Icon name="agent" size={40} />
          <div>
            <h2 id="agents" className="text-xl font-semibold">Let your AI assistant run it</h2>
            <p className="mt-1 text-primary-foreground/70">
              Connect Claude, ChatGPT, Meta Muse or Cursor to our MCP server. Your assistant creates the game, shares the link and enters scores.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/docs/mcp">Connect</Link>
          </Button>
        </section>

        <section aria-labelledby="faq" className="space-y-6">
          <h2 id="faq" className="text-2xl font-semibold tracking-tight">
            Questions
          </h2>
          <dl className="grid gap-6 sm:grid-cols-2">
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt className="font-medium">{f.q}</dt>
                <dd className="mt-1 text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <link rel="alternate" type="text/markdown" href={absoluteUrl("/llms.txt")} />
    </>
  );
}
