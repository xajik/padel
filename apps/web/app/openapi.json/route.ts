import { MODES } from "@padel/engine";
import { SITE, absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: `${SITE.name} API`,
      version: "1.0.0",
      description:
        "Generate fair padel Americano/Mexicano schedules. No authentication. To create and run live games from an AI assistant, use the MCP server at " +
        absoluteUrl("/mcp") +
        ". To send a user straight into a pre-filled setup, link to " +
        absoluteUrl("/new?mode={mode}&players={n}&courts={c}&points={p}&names={comma-separated}") +
        ".",
    },
    servers: [{ url: SITE.url }],
    paths: {
      "/api/v1/schedule": {
        get: {
          operationId: "generateSchedule",
          summary: "Round-by-round schedule for a padel session",
          parameters: [
            { name: "mode", in: "query", schema: { type: "string", enum: MODES.map((m) => m.id), default: "americano" } },
            { name: "players", in: "query", schema: { type: "integer", minimum: 4, maximum: 24, default: 8 } },
            { name: "courts", in: "query", schema: { type: "integer", minimum: 1, maximum: 6 } },
            { name: "points", in: "query", schema: { type: "integer", minimum: 4, maximum: 64, default: 24 } },
            { name: "rounds", in: "query", schema: { oneOf: [{ type: "integer", minimum: 1, maximum: 30 }, { const: "auto" }], default: "auto" } },
            { name: "names", in: "query", description: "Comma-separated player names", schema: { type: "string" } },
            { name: "seed", in: "query", description: "Same seed → same schedule", schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Schedule with rounds, sit-outs, estimate and a playUrl deep link" },
            "400": { description: "Invalid parameters" },
            "422": { description: "Setup not possible (e.g. unequal Mixicano sides)" },
          },
        },
      },
      "/api/v1/modes": {
        get: { operationId: "listModes", summary: "All supported formats", responses: { "200": { description: "Mode catalogue" } } },
      },
    },
  };
  return Response.json(spec, { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } });
}
