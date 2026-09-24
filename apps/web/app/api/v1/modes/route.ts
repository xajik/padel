import { MODES } from "@padel/engine";
import { json } from "@/lib/api";
import { MODE_GUIDES } from "@/lib/content/modes";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  return json({
    modes: MODES.map((m) => {
      const g = MODE_GUIDES.find((x) => x.id === m.id)!;
      return {
        id: m.id,
        name: m.name,
        summary: m.summary,
        fixedTeams: m.teams,
        resultDependent: m.dynamic,
        fourPlayersPerCourt: m.fullCourts,
        twoSides: m.sides,
        players: g.players,
        guide: absoluteUrl(`/modes/${m.id}`),
        guideMarkdown: absoluteUrl(`/modes/${m.id}.md`),
      };
    }),
  });
}
