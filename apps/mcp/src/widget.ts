import { modeInfo } from "@padel/engine";
import { roundView, standingsView, type PublicGame } from "./game";

/** ChatGPT / MCP Apps UI: one widget renders rounds, scores and the leaderboard for every game tool. */
export const WIDGET_URI = "ui://padel/game-v1.html";
export const WIDGET_MIME = "text/html;profile=mcp-app";

/** Tool `_meta` that attaches the widget (MCP Apps key plus the ChatGPT alias). */
export function widgetToolMeta(invoking: string, invoked: string) {
  return {
    ui: { resourceUri: WIDGET_URI },
    "openai/outputTemplate": WIDGET_URI,
    "openai/widgetAccessible": true,
    "openai/toolInvocation/invoking": invoking,
    "openai/toolInvocation/invoked": invoked,
  };
}

/**
 * The widget's data, sent in the tool result's `_meta` so the model never sees it.
 * `organizerKey` is included only when the caller already proved it, so the widget can score with it.
 */
export function widgetView(g: PublicGame, siteUrl: string, access: { canEdit: boolean; organizerKey?: string }) {
  const { state } = g;
  const fixed = !modeInfo(state.settings.mode).dynamic;
  // Played and current rounds, plus the pre-generated next one when the schedule doesn't depend on results.
  const last = Math.min(state.rounds.length - 1, state.current + (fixed && g.status === "live" ? 1 : 0));
  return {
    v: 1,
    kind: "game" as const,
    code: g.code,
    name: g.name,
    status: g.status,
    modeName: modeInfo(state.settings.mode).name,
    scoring: { type: state.settings.scoring.type, points: state.settings.scoring.points ?? null },
    leaderboard: state.settings.leaderboard,
    currentRound: state.current + 1,
    plannedRounds: state.plannedRounds,
    rounds: state.rounds.slice(0, last + 1).map((r) => roundView(state, r)),
    standings: standingsView(state),
    spectatorUrl: `${siteUrl}/g/${g.code}`,
    canEdit: access.canEdit && g.status === "live",
    ...(access.canEdit && access.organizerKey ? { organizerKey: access.organizerKey } : {}),
  };
}

export type WidgetView = ReturnType<typeof widgetView>;

/** preview_schedule: the rounds of a schedule nobody has saved yet, with a link to start it in the app. */
export function previewView(p: { modeName: string; rounds: unknown[]; duration: string; playUrl: string; scoring: { type: string; points?: number } }) {
  return {
    v: 1,
    kind: "preview" as const,
    name: `${p.modeName} schedule`,
    modeName: p.modeName,
    duration: p.duration,
    playUrl: p.playUrl,
    scoring: { type: p.scoring.type, points: p.scoring.points ?? null },
    rounds: p.rounds,
  };
}
