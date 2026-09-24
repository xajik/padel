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

## Run, test and deploy (`make help` lists everything)

| Stage | Command | What it does |
|---|---|---|
| Setup | `make install` · `make login` · `make cf-setup` | Dependencies, wrangler login, R2 cache bucket (one-time) |
| Run | `make dev` | MCP worker (:8788) + web app (:3100) together |
| | `make dev-web` / `make dev-mcp` | Each on its own |
| | `make preview` | Production web build in the real Workers runtime |
| Check | `make check` | Engine + MCP tests and typecheck of all packages |
| | `make smoke URL=…` · `make e2e-mcp URL=…` | Route/crawler smoke test and full MCP game flow against any URL |
| Build | `make build` · `make dry-run` | OpenNext build · bundle both workers without deploying |
| Preview | `make upload-preview` | Non-live web version at `https://<branch>-padel-web.xajik0.workers.dev` |
| Deploy | `make deploy` | check → deploy MCP → deploy web → production smoke + MCP e2e |
| | `make deploy-mcp` / `make deploy-web` / `make deploy-fast` | Partial or unchecked deploys |
| Release | `make release TAG=v0.4.0` | Clean tree required; deploy, then tag and push |
| Operate | `make logs-web` · `make logs-mcp` · `make versions` | Live logs and deployment history |
| | `make rollback-web` · `make rollback-mcp` | Roll back to the previous version |
| | `make secret-web NAME=…` · `make secret-mcp NAME=…` | Set Worker secrets |
| Other | `make types` · `make icons` · `make clean` | Regenerate types, export icons, remove build output |

The web Worker binds to `padel-mcp` (service binding `MCP`) and serves it at `/mcp` and `/api/games/*`, so always deploy MCP first (`make deploy` does). The OpenNext incremental cache lives in the R2 bucket `padel-web-opennext-cache`.

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
