import type { Metadata } from "next";
import { Icon } from "@/components/icons/icon";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Connect your AI assistant (MCP)",
  description:
    "Let your agent create padel Americano games, share the link, enter scores and read the leaderboard.",
  alternates: { canonical: "/docs/mcp" },
};

const TOOLS: [string, string][] = [
  ["list_modes", "All 8 formats with rules and player limits."],
  ["explain_mode", "Rules, scoring and an example schedule for one format."],
  ["preview_schedule", "Generate a schedule without saving anything."],
  ["create_game", "Create an anonymous game. Returns the join code, a spectator link, an organizer link and round 1."],
  ["join_game", "Connect to a game by code. Add the organizer key to get score-editing rights."],
  ["list_my_games", "Signed-in endpoint only: the games in your account, from any device."],
  ["get_game / get_round / get_standings", "Read the current state, a round, or the leaderboard."],
  ["submit_score", "Record a match score. With total points, one side is enough."],
  ["next_round", "Start the next round once every score is in."],
  ["finish_game", "Freeze the results and show the podium."],
];

export default function McpDocsPage() {
  const endpoint = absoluteUrl("/mcp");
  const accountEndpoint = absoluteUrl("/mcp/account");
  const accountSnippets: [string, string][] = [
    ["Claude (claude.ai / desktop)", `Settings → Connectors → Add custom connector\nURL: ${accountEndpoint}\nClaude opens a sign-in window: continue with Google or Apple, then Allow.`],
    ["Claude Code", `claude mcp add --transport http americanoo ${accountEndpoint}\nThen run /mcp and choose Authenticate.`],
    ["ChatGPT", `Settings → Apps & Connectors → Create\nMCP server URL: ${accountEndpoint}\nAuthentication: OAuth`],
  ];
  const snippets: [string, string][] = [
    ["Meta Muse", `Paste the setup prompt from ${absoluteUrl("/docs/muse")} into a Muse chat.\nMCP server URL: ${endpoint} (streamable HTTP, no authentication)`],
    ["Claude (claude.ai / desktop)", `Settings → Connectors → Add custom connector\nURL: ${endpoint}`],
    ["Claude Code", `claude mcp add --transport http padel ${endpoint}`],
    ["ChatGPT", `Settings → Apps & Connectors → Create\nMCP server URL: ${endpoint}\nAuthentication: none`],
    ["Cursor / VS Code (mcp.json)", JSON.stringify({ mcpServers: { padel: { url: endpoint } } }, null, 2)],
  ];
  return (
    <article className="mx-auto w-full max-w-3xl space-y-10 px-4 py-10">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "AI assistants", href: "/docs/mcp" }]} />
      <header className="space-y-4">
        <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Icon name="agent" size={26} />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Run your Americano from an AI assistant</h1>
        <p className="text-lg text-pretty">
          Connect any MCP-compatible assistant to <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-base">{endpoint}</code>. Then just say:
        </p>
        <blockquote className="rounded-2xl border p-5 text-lg">
          “Set up an Americano for Anna, Mikko, Laura, Jussi, Sara, Pekka, Emma and Olli on 2 courts, 24 points.”
        </blockquote>
        <p className="text-muted-foreground">
          No account needed (or sign in, see below). Your assistant gets a share link for the group chat and an organizer link to keep scoring from your phone.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Connect</h2>
        <div className="space-y-3">
          {snippets.map(([title, code]) => (
            <div key={title} className="rounded-2xl border">
              <p className="border-b px-4 py-2.5 text-sm font-medium">{title}</p>
              <pre className="overflow-x-auto px-4 py-3 font-mono text-sm">{code}</pre>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Sign in to keep games in your account</h2>
        <p className="text-muted-foreground">
          Connect <code className="font-mono">{accountEndpoint}</code> instead to sign in with Google or Apple. Games your
          assistant creates then appear in the {"app's"} and {"website's"} “My games”, your assistant can edit them without an
          organizer key, and <code className="font-mono">list_my_games</code> finds games from earlier conversations.
        </p>
        <div className="space-y-3">
          {accountSnippets.map(([title, code]) => (
            <div key={title} className="rounded-2xl border">
              <p className="border-b px-4 py-2.5 text-sm font-medium">{title}</p>
              <pre className="overflow-x-auto px-4 py-3 font-mono text-sm whitespace-pre-wrap">{code}</pre>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Tools</h2>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <tbody>
              {TOOLS.map(([name, desc]) => (
                <tr key={name} className="border-b align-top last:border-0">
                  <th scope="row" className="px-4 py-3 text-left font-mono font-medium whitespace-nowrap">{name}</th>
                  <td className="px-4 py-3 text-muted-foreground">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Links: spectator vs organizer</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Spectator link</strong> (<code className="font-mono">/g/CODE</code>): read-only, safe to share with everyone.</li>
          <li><strong>Organizer link</strong> (<code className="font-mono">/g/CODE?key=…</code>): lets that device enter scores. Keep it to yourself.</li>
        </ul>
      </section>
    </article>
  );
}
