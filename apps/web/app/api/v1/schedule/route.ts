import { MODES, type ModeId } from "@padel/engine";
import { apiError, CORS, json } from "@/lib/api";
import { buildSchedule, isModeId, nameOf, ScheduleError } from "@/lib/schedule";

/** GET /api/v1/schedule: public schedule generator (FR-7.4.6). Runs the engine in the Worker. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const mode = q.get("mode") ?? "americano";
  if (!isModeId(mode)) {
    return apiError(400, "INVALID_MODE", `Unknown mode “${mode}”.`, `Use one of: ${MODES.map((m) => m.id).join(", ")}.`);
  }
  const names = q.get("names")?.split(",").map((n) => n.trim()).filter(Boolean).slice(0, 24);
  const players = Number(q.get("players") ?? names?.length ?? 8);
  const courts = Number(q.get("courts") ?? Math.min(2, Math.floor(players / 4)));
  const points = Number(q.get("points") ?? 24);
  const roundsParam = q.get("rounds");
  const rounds = !roundsParam || roundsParam === "auto" ? "auto" : Number(roundsParam);
  if (![players, courts, points].every(Number.isInteger) || (rounds !== "auto" && !(rounds >= 1 && rounds <= 30))) {
    return apiError(400, "INVALID_PARAMS", "players, courts, points and rounds must be whole numbers.", "Example: ?mode=americano&players=10&courts=2&points=24");
  }

  try {
    const r = buildSchedule({ mode: mode as ModeId, players, courts, points, rounds, names, seed: q.get("seed") ?? undefined });
    const name = (id: string) => nameOf(r.state, id);
    return json({
      mode: r.request.mode,
      players: r.state.players.map((p) => ({ id: p.id, name: p.name, ...(p.teamId ? { team: p.teamId } : {}), ...(p.side ? { side: p.side } : {}) })),
      courts: r.request.courts,
      pointsPerMatch: r.request.points,
      seed: r.request.seed,
      resultDependent: MODES.find((m) => m.id === mode)!.dynamic,
      rounds: r.state.rounds.map((round) => ({
        round: round.index + 1,
        matches: round.matches.map((m) => ({ court: m.court, teamA: m.teamA.map(name), teamB: m.teamB.map(name) })),
        sittingOut: round.byes.map(name),
      })),
      estimate: { ...r.estimate, duration: r.duration },
      playUrl: r.playUrl,
    });
  } catch (e) {
    if (e instanceof ScheduleError) return apiError(422, e.code, e.message);
    throw e;
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
