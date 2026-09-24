import { formatDuration, estimate, modeInfo, MODES, defaultSettings } from "@padel/engine";
import { buildSchedule, scheduleCombos, scheduleMarkdown, scheduleSlug, playUrl, SCHEDULE_MODES, type ScheduleResult } from "../schedule";
import { absoluteUrl, SITE } from "../site";
import { MODE_GUIDES, type ModeGuide } from "@padel/content";

export function modeMarkdown(g: ModeGuide): string {
  const ex = exampleSchedule(g);
  return [
    `# ${g.title}`,
    "",
    `> ${g.answer}`,
    "",
    `- **Players:** ${g.players}`,
    `- **Best for:** ${g.bestFor}`,
    `- **Start one:** ${playUrl({ mode: g.id, players: g.example.players, courts: g.example.courts })}`,
    "",
    "## How it works",
    "",
    ...g.steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "## Scoring",
    "",
    g.scoring,
    "",
    "## Tips",
    "",
    ...g.tips.map((t) => `- ${t}`),
    "",
    ...(ex
      ? [
          `## Example: ${g.example.players} players on ${g.example.courts} courts`,
          "",
          modeInfo(g.id).dynamic
            ? "Round 1 is shown; later rounds are drawn from the standings."
            : `${ex.estimate.rounds} rounds, ${ex.estimate.matches} matches, about ${ex.duration} at 24 points.`,
          "",
          scheduleMarkdown(ex),
          "",
        ]
      : []),
    "## FAQ",
    "",
    ...g.faq.flatMap((f) => [`### ${f.q}`, "", f.a, ""]),
    `Source: ${absoluteUrl(`/modes/${g.id}`)}`,
    "",
  ].join("\n");
}

export function exampleSchedule(g: ModeGuide): ScheduleResult | null {
  try {
    return buildSchedule({ mode: g.id, players: g.example.players, courts: g.example.courts, seed: `guide-${g.id}` });
  } catch {
    return null;
  }
}

export function scheduleTitle(r: ScheduleResult): string {
  return `${modeInfo(r.request.mode).name} schedule for ${r.request.players} players on ${r.request.courts} court${r.request.courts > 1 ? "s" : ""}`;
}

export function scheduleSummary(r: ScheduleResult): string {
  const e = r.estimate;
  const perPlayer = e.perPlayerMin === e.perPlayerMax ? `${e.perPlayerMax}` : `${e.perPlayerMin}–${e.perPlayerMax}`;
  const byes = e.byesPerPlayerMax ? ` Each player sits out ${e.byesPerPlayerMax === 1 ? "once" : `up to ${e.byesPerPlayerMax} times`}.` : " Nobody sits out.";
  return `${r.request.players} players on ${r.request.courts} court${r.request.courts > 1 ? "s" : ""} play ${e.rounds} rounds (${e.matches} matches, ${perPlayer} per player), about ${r.duration} at ${r.request.points} points per match.${byes}`;
}

export function scheduleMarkdownPage(r: ScheduleResult): string {
  return [
    `# ${scheduleTitle(r)}`,
    "",
    `> ${scheduleSummary(r)}`,
    "",
    `Play this schedule with live scoring: ${r.playUrl}`,
    "",
    scheduleMarkdown(r),
    "",
    `Source: ${absoluteUrl(`/schedule/${r.request.mode}/${scheduleSlug(r.request.players, r.request.courts)}`)}`,
    "",
  ].join("\n");
}

/** /llms.txt: curated index for LLMs and agents (FR-7.4.1). */
export function llmsTxt(): string {
  const e = estimate(defaultSettings("americano", 8), 8);
  return [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description} Example: 8 players on 2 courts play ${e.rounds} rounds (${e.matches} matches) in about ${formatDuration(e.minutes)}.`,
    "",
    "Anyone can create and run a game without an account. Formats: " + MODES.map((m) => m.name).join(", ") + ".",
    "",
    "## Start a game (deep link)",
    "",
    `- ${absoluteUrl("/new")}?mode={mode}&players={4-24}&courts={1-6}&points={4-64}&names={comma-separated}`,
    `- Example: ${playUrl({ mode: "americano", players: 8, courts: 2, points: 24, names: ["Anna", "Mikko", "Laura", "Jussi", "Sara", "Pekka", "Emma", "Olli"] })}`,
    `- mode is one of: ${MODES.map((m) => m.id).join(", ")}`,
    "",
    "## Format guides",
    "",
    ...MODE_GUIDES.map((g) => `- [${g.title}](${absoluteUrl(`/modes/${g.id}.md`)}): ${firstSentence(g.answer)}`),
    "",
    "## Schedules",
    "",
    `- [All schedules](${absoluteUrl("/schedule")}): round-by-round tables for ${SCHEDULE_MODES.map((m) => modeInfo(m).name).join(" and ")}, 4–24 players, 1–6 courts.`,
    `- URL pattern: ${absoluteUrl("/schedule/{mode}/{players}-players-{courts}-courts.md")} (use "-1-court" for one court, e.g. ${absoluteUrl("/schedule/americano/5-players-1-court.md")})`,
    "",
    "## API and agents",
    "",
    `- [Schedule API](${absoluteUrl("/api/v1/schedule?mode=americano&players=10&courts=2")}): JSON schedule for any valid setup. No auth. OpenAPI: ${absoluteUrl("/openapi.json")}`,
    `- [Modes API](${absoluteUrl("/api/v1/modes")})`,
    `- [MCP server](${absoluteUrl("/docs/mcp")}): connect an AI assistant to create anonymous games, join them by code, enter scores and read standings. Endpoint: ${absoluteUrl("/mcp")} (streamable HTTP, no auth)`,
    `- [Games REST API](${absoluteUrl("/openapi.json")}): POST /api/v1/games creates a live game and returns an organizerKey; send it as \`Authorization: Bearer <organizerKey>\` to /scores, /next and /finish.`,
    `- [Meta Muse setup](${absoluteUrl("/docs/muse")}): one prompt adds Padel Americano to Muse as a custom integration.`,
    "",
    "## Optional",
    "",
    `- [Full text of all guides](${absoluteUrl("/llms-full.txt")})`,
    "",
  ].join("\n");
}

export function llmsFullTxt(): string {
  return [
    `# ${SITE.name}: full guide text`,
    "",
    `> ${SITE.description}`,
    "",
    ...MODE_GUIDES.map((g) => modeMarkdown(g).replace(/^# /, "## ").replace(/\n## /g, "\n### ").replace(/\n### (?=[^\n]*\?)/g, "\n#### ")),
    "## Schedule index",
    "",
    ...scheduleCombos().map((c) => `- ${absoluteUrl(`/schedule/${c.mode}/${scheduleSlug(c.players, c.courts)}.md`)}`),
    "",
  ].join("\n");
}

/** Markdown mirror response; the HTML page stays canonical so search engines don't see duplicates. */
export const markdownResponse = (body: string, canonicalPath?: string) =>
  new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      Vary: "Accept",
      ...(canonicalPath ? { Link: `<${absoluteUrl(canonicalPath)}>; rel="canonical"` } : {}),
    },
  });

function firstSentence(text: string): string {
  return text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;
}
