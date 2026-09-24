#!/usr/bin/env bash
# Smoke-test public routes of a deployed (or local) web app: scripts/smoke.sh [base-url]
set -uo pipefail
BASE="${1:-http://localhost:3100}"
fail=0
check() { # path expected-status [user-agent]
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' ${3:+-A "$3"} "$BASE$1")
  if [[ "$code" == "$2" ]]; then echo "ok   $code $1 ${3:-}"; else echo "FAIL $code (want $2) $1 ${3:-}"; fail=1; fi
}
for p in / /modes /modes/mexicano /modes/americano.md /schedule /schedule/americano/10-players-2-courts \
  /schedule/americano/10-players-2-courts.md /llms.txt /llms-full.txt /robots.txt /sitemap.xml \
  "/api/v1/schedule?mode=americano&players=8&courts=2" /api/v1/modes /openapi.json /docs/mcp /new \
  /opengraph-image /manifest.webmanifest; do check "$p" 200; done
for ua in ClaudeBot GPTBot PerplexityBot OAI-SearchBot; do check /modes/americano 200 "$ua"; done
curl -sI "$BASE/g/ABCDEF" | grep -qi "x-robots-tag: noindex" && echo "ok   game pages are noindex" || { echo "FAIL game pages missing noindex"; fail=1; }
exit $fail
