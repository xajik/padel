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
      "/api/v1/games": {
        post: {
          operationId: "createGame",
          summary: "Create and start an anonymous live game",
          description:
            "Returns the join code, spectatorUrl (safe to share with players), organizerUrl and organizerKey (keep private; needed for scoring) and round 1.",
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateGame" } } } },
          responses: {
            "201": { description: "Game created", content: { "application/json": { schema: { $ref: "#/components/schemas/CreatedGame" } } } },
            "422": { $ref: "#/components/responses/Error" },
            "429": { $ref: "#/components/responses/Error" },
          },
        },
      },
      "/api/v1/games/{code}": {
        get: {
          operationId: "getGame",
          summary: "Game summary, current round and standings",
          parameters: [{ $ref: "#/components/parameters/Code" }],
          responses: { "200": { description: "Game details" }, "404": { $ref: "#/components/responses/Error" } },
        },
      },
      "/api/v1/games/{code}/rounds/{round}": {
        get: {
          operationId: "getRound",
          summary: "Courts, teams, scores and sit-outs for one round",
          parameters: [{ $ref: "#/components/parameters/Code" }, { name: "round", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
          responses: { "200": { description: "Round" }, "422": { $ref: "#/components/responses/Error" } },
        },
      },
      "/api/v1/games/{code}/standings": {
        get: {
          operationId: "getStandings",
          summary: "Leaderboard with rank movement",
          parameters: [{ $ref: "#/components/parameters/Code" }],
          responses: { "200": { description: "Standings" } },
        },
      },
      "/api/v1/games/{code}/scores": {
        post: {
          operationId: "submitScore",
          summary: "Record one court's score (organizer)",
          description: "With total-points scoring (default 24) one side is enough: the other is filled in. With win/loss scoring send 1 for the winner and 0 for the loser.",
          security: [{ organizerKey: [] }],
          parameters: [{ $ref: "#/components/parameters/Code" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["court"],
                  properties: {
                    court: { type: "integer", minimum: 1, maximum: 6 },
                    scoreA: { type: "integer", minimum: 0 },
                    scoreB: { type: "integer", minimum: 0 },
                    round: { type: "integer", minimum: 1, description: "Defaults to the current round" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Updated round and standings; roundComplete tells you when to call next" }, "403": { $ref: "#/components/responses/Error" }, "422": { $ref: "#/components/responses/Error" } },
        },
      },
      "/api/v1/games/{code}/next": {
        post: {
          operationId: "nextRound",
          summary: "Start the next round once every court is scored (organizer)",
          security: [{ organizerKey: [] }],
          parameters: [{ $ref: "#/components/parameters/Code" }],
          responses: { "200": { description: "The new round" }, "409": { $ref: "#/components/responses/Error" } },
        },
      },
      "/api/v1/games/{code}/finish": {
        post: {
          operationId: "finishGame",
          summary: "Freeze results and return the podium (organizer)",
          security: [{ organizerKey: [] }],
          parameters: [{ $ref: "#/components/parameters/Code" }],
          responses: { "200": { description: "Final standings" } },
        },
      },
    },
    components: {
      securitySchemes: {
        organizerKey: {
          type: "http",
          scheme: "bearer",
          description: "The organizerKey returned by createGame. Also accepted as the X-Organizer-Key header.",
        },
      },
      parameters: {
        Code: { name: "code", in: "path", required: true, description: "6-character game code", schema: { type: "string", pattern: "^[A-HJ-KM-NP-Z2-9]{6}$" } },
      },
      responses: {
        Error: {
          description: "Error with an actionable message",
          content: { "application/json": { schema: { type: "object", properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" } } } } } } },
        },
      },
      schemas: {
        CreateGame: {
          type: "object",
          properties: {
            mode: { type: "string", enum: MODES.map((m) => m.id), default: "americano" },
            names: { type: "array", items: { type: "string", maxLength: 24 }, maxItems: 24, description: "Player names; consecutive names form pairs in team formats" },
            players: { type: "integer", minimum: 4, maximum: 24, description: "Player count when names are unknown" },
            courts: { type: "integer", minimum: 1, maximum: 6 },
            scoring: { type: "string", enum: ["total", "first_to", "timed", "off"], default: "total" },
            points: { type: "integer", minimum: 4, maximum: 64, default: 24 },
            minutes: { type: "integer", minimum: 5, maximum: 60 },
            shuffle: { type: "string", enum: ["balanced", "random", "manual"] },
            leaderboard: { type: "string", enum: ["points", "wins", "average"] },
            rounds: { oneOf: [{ type: "integer", minimum: 1, maximum: 30 }, { enum: ["auto", "open"] }] },
            name: { type: "string", maxLength: 60 },
            sides: { type: "array", items: { enum: ["A", "B"] }, description: "Mixicano: side per player" },
            byeCompensation: { type: "boolean" },
          },
        },
        CreatedGame: {
          type: "object",
          properties: {
            code: { type: "string" },
            name: { type: "string" },
            spectatorUrl: { type: "string", description: "Share with players (read-only)" },
            organizerUrl: { type: "string", description: "Private: opens the game with scoring rights" },
            organizerKey: { type: "string", description: "Private: bearer token for scores/next/finish" },
            qrUrl: { type: "string" },
            round: { type: "object" },
          },
        },
      },
    },
  };
  return Response.json(spec, { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } });
}
