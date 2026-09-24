import type { Metadata } from "next";
import Link from "next/link";
import { CopyBlock } from "@/components/app/copy-block";
import { JsonLd } from "@/components/app/json-ld";
import { Icon } from "@/components/icons/icon";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MUSE_TRY, musePrompt } from "@/lib/content/muse";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Meta Muse connector: run padel Americano games from Muse",
  description:
    "Add Padel Americano to Meta Muse as a custom integration. Muse creates the game, shares the link, enters scores and shows the leaderboard. No account or token needed.",
  alternates: { canonical: "/docs/muse" },
};

const STEPS = [
  { t: "Open a Muse chat", d: "On the web, in the app, or on your glasses. Custom integrations work on every Muse plan." },
  { t: "Paste the setup prompt", d: "Muse reads our MCP server, builds the integration, tests it and saves it as a skill." },
  { t: "Skip the credential prompt", d: "Padel Americano needs no token. If Muse asks for one, answer “no authentication is required”." },
  { t: "Try it", d: "Ask Muse to set up a game. It replies with a share link for your group and keeps the organizer key to itself." },
];

export default function MusePage() {
  const prompt = musePrompt();
  return (
    <article className="mx-auto w-full max-w-3xl space-y-10 px-4 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Connect Padel Americano to Meta Muse",
          step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.t, text: s.d })),
        }}
      />
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "AI assistants", href: "/docs/mcp" },
          { name: "Meta Muse", href: "/docs/muse" },
        ]}
      />
      <header className="space-y-4">
        <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Icon name="agent" size={26} />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Run your padel games from Meta Muse</h1>
        <p className="text-lg text-pretty">
          Add Padel Americano to Muse as a custom integration in one message. After that, just say “set up an Americano for these 8 players on 2 courts” and Muse creates the game, sends you the link for the group chat, records scores and tells you who is winning.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Set up (about a minute)</h2>
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.t} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border font-mono text-xs">{i + 1}</span>
              <span className="pt-0.5">
                <span className="font-medium">{s.t}.</span> <span className="text-muted-foreground">{s.d}</span>
              </span>
            </li>
          ))}
        </ol>
        <CopyBlock title="Paste this into Muse" text={prompt} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Things to ask Muse</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {MUSE_TRY.map((t) => (
            <li key={t} className="rounded-xl border p-3 text-sm">“{t}”</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What Muse can do</h2>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <tbody>
              {[
                ["Create games", "Any of the 8 formats, 4–24 players, 1–6 courts, your points and rounds."],
                ["Share", "A spectator link and QR code for the group. It updates live on everyone's phone."],
                ["Score", "Court by court. With total points, one side is enough."],
                ["Advance", "Starts the next round when every court is scored. Mexicano redraws from the standings."],
                ["Report", "Current round, leaderboard with movement, and the final podium."],
                ["Explain", "Rules of every format and which one suits your group."],
              ].map(([k, v]) => (
                <tr key={k} className="border-b align-top last:border-0">
                  <th scope="row" className="px-4 py-3 text-left font-medium whitespace-nowrap">{k}</th>
                  <td className="px-4 py-3 text-muted-foreground">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Privacy and safety</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
          <li>No account, token or sign-in. Games are anonymous and only hold the player names you give.</li>
          <li>Each game has a private <strong className="text-foreground">organizer key</strong> that allows scoring. Muse keeps it; share only the spectator link.</li>
          <li>To keep scoring on your phone, ask Muse for the <em>organizer link</em> and open it once on that phone.</li>
          <li>Meta doesn’t review custom integrations. Everything here is documented publicly in our <Link className="underline underline-offset-4" href="/openapi.json">OpenAPI spec</Link> and <Link className="underline underline-offset-4" href="/docs/mcp">MCP guide</Link>.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Technical details</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {[
            ["MCP server", absoluteUrl("/mcp")],
            ["Transport", "Streamable HTTP (stateless)"],
            ["Authentication", "None. Organizer key per game for writes"],
            ["REST alternative", absoluteUrl("/openapi.json")],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border p-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-mono break-all">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}
