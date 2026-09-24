import { absoluteUrl } from "../site";

/** Copy-paste setup for Meta Muse custom integrations (MCP URL or OpenAPI; no sign-in). */
export function musePrompt(): string {
  return `Build a custom integration to Padel Americano, a padel Americano and Mexicano organizer.
Its MCP server URL is ${absoluteUrl("/mcp")} (streamable HTTP). It needs no authentication.
If you prefer REST, its OpenAPI document is ${absoluteUrl("/openapi.json")}.
I want you to be able to create padel games for my group, give me the link to share with players, enter scores court by court, start the next round and show the leaderboard.
When you create a game, keep its organizerKey private and use it for scoring. Only share the spectatorUrl with other people.`;
}

export const MUSE_TRY = [
  "Set up an Americano for Anna, Mikko, Laura, Jussi, Sara, Pekka, Emma and Olli on 2 courts, 24 points.",
  "Court 1 finished 15–9, court 2 was 11–13.",
  "Start the next round.",
  "Who's leading?",
  "How does Mexicano work, and would it suit 10 of us on 2 courts?",
  "Finish the game and give me the podium.",
];
