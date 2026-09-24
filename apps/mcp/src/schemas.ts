import { z } from "zod";
import { MODES, type ModeId } from "@padel/engine";

export const MODE_IDS = MODES.map((m) => m.id) as [ModeId, ...ModeId[]];

/** create_game / POST /api/v1/games input (shared by MCP and REST). */
export const createGameInput = z.object({
  mode: z.enum(MODE_IDS).default("americano"),
  names: z.array(z.string()).max(24).optional().describe("Player names (4–24). Consecutive names form pairs in team formats."),
  players: z.number().int().min(4).max(24).optional().describe("Player count when names are unknown"),
  courts: z.number().int().min(1).max(6).optional(),
  scoring: z.enum(["total", "first_to", "timed", "off"]).optional().describe("Default total: both scores add up to `points`"),
  points: z.number().int().min(4).max(64).optional().describe("Default 24"),
  minutes: z.number().int().min(5).max(60).optional().describe("Minutes per round for timed scoring"),
  shuffle: z.enum(["balanced", "random", "manual"]).optional(),
  leaderboard: z.enum(["points", "wins", "average"]).optional(),
  rounds: z.union([z.number().int().min(1).max(30), z.literal("auto"), z.literal("open")]).optional(),
  name: z.string().max(60).optional().describe("Game name"),
  sides: z.array(z.enum(["A", "B"])).optional().describe("Mixicano: side per player, same order as names"),
  byeCompensation: z.boolean().optional().describe("Credit sit-out players with their average points"),
});

export const scoreInput = z.object({
  court: z.number().int().min(1).max(6),
  scoreA: z.number().int().min(0).max(99).optional(),
  scoreB: z.number().int().min(0).max(99).optional(),
  round: z.number().int().min(1).optional().describe("Defaults to the current round"),
});
