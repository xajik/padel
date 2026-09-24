# Padel Americano

Fair padel Americano, Mexicano and 6 more social formats in 30 seconds: rotations, live scores and a leaderboard. No sign-up. AI assistants can run games through an MCP server.

- **Live:** https://padel-web.xajik0.workers.dev
- **MCP endpoint:** https://padel-web.xajik0.workers.dev/mcp · [connection guide](https://padel-web.xajik0.workers.dev/docs/mcp)
- **Product:** [docs/PRD.md](docs/PRD.md) · **Requirements:** [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)

## Layout

| Path | What |
|---|---|
| `packages/engine` | Pure TypeScript pairing & scoring engine for all 8 formats (deterministic, seeded). The Flutter app will port it and reuse its tests. |
| `packages/content` | Format guides (single source for web pages, Markdown mirrors, `llms.txt`, MCP `explain_mode`). |
| `packages/design` | Design tokens (`tokens.json`) and the custom icon set (`icons.ts`, exported to `svg/` for Flutter). |
| `apps/web` | Next.js 16 (App Router) + shadcn/ui, deployed to Cloudflare Workers with OpenNext. |
| `apps/mcp` | Remote MCP server Worker (stateless Streamable HTTP) + `GameRoom` Durable Objects that store games created by assistants. |

## Develop

```bash
npm install
npm test -w @padel/engine            # engine tests
npm test -w @padel/mcp               # MCP unit tests

# MCP worker (needed for /mcp and cloud games in the web dev server)
cd apps/mcp && npx wrangler dev --port 8788

# Web app (service binding to the local MCP worker via the wrangler dev registry)
cd apps/web && npx next dev --port 3100
```

## Deploy (Cloudflare, wrangler)

```bash
cd apps/mcp && npx wrangler deploy                                         # padel-mcp
cd apps/web && npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy   # padel-web
```

The web Worker binds to `padel-mcp` (service binding `MCP`) and serves it at `/mcp` and `/api/games/*`. The OpenNext incremental cache lives in the R2 bucket `padel-web-opennext-cache`.

## Credentials (pending)

The app runs fully without credentials:
- **Games** are stored on the device. Games created by AI assistants are stored in Durable Objects.
- **Sign-in** is a guest identity.
- **Analytics** log to the console.

Supplying these switches on the real integrations (see `lib/config.ts` and docs/REQUIREMENTS.md §12):

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` | Google sign-in + Firestore (`TODO(firebase)` markers) |
| `NEXT_PUBLIC_AMPLITUDE_API_KEY` | Product analytics (`TODO(amplitude)` in `lib/analytics.ts`) |

`NEXT_PUBLIC_*` values are inlined at build time. Set them in `apps/web/.env.production` or in CI before `opennextjs-cloudflare build`.
