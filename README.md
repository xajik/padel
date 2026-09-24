# Padel Americano

Fair padel Americano / Mexicano sessions in seconds. Web (Next.js on Cloudflare Workers) → Flutter mobile later. Backend: Firebase.

- Product: [docs/PRD.md](docs/PRD.md)
- Requirements: [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)

## Layout
- `packages/engine` — pure TS pairing & scoring engine
- `apps/web` — Next.js app deployed to Cloudflare Workers via OpenNext + wrangler
- `apps/mcp` — MCP server Worker
