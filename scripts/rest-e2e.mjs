// End-to-end check of the REST game API (the OpenAPI path used by e.g. Meta Muse):
//   node scripts/rest-e2e.mjs [base-url]
const BASE = (process.argv[2] ?? "http://localhost:3100").replace(/\/$/, "");
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok -", m); };
async function req(method, path, body, key) {
  const r = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

const spec = await (await fetch(`${BASE}/openapi.json`)).json();
for (const p of ["/api/v1/games", "/api/v1/games/{code}", "/api/v1/games/{code}/scores", "/api/v1/games/{code}/next", "/api/v1/games/{code}/finish"])
  assert(spec.paths[p], `openapi documents ${p}`);

const bad = await req("POST", "/api/v1/games", { mode: "up-and-down", players: 10, courts: 2 });
assert(bad.status === 422 && bad.body.error.code === "MULTIPLE_OF_FOUR", "invalid setup → 422 with actionable message");
const badBody = await req("POST", "/api/v1/games", { mode: "nope" });
assert(badBody.status === 400 && badBody.body.error.code === "INVALID_BODY", "unknown mode → 400 INVALID_BODY");

const c = await req("POST", "/api/v1/games", { mode: "americano", names: ["Anna", "Mikko", "Laura", "Jussi", "Sara", "Pekka", "Emma", "Olli"], courts: 2, name: "REST test" });
assert(c.status === 201 && c.body.organizerKey && c.body.spectatorUrl, `created ${c.body.code}`);
const { code, organizerKey } = c.body;

const g = await req("GET", `/api/v1/games/${code}`);
assert(g.status === 200 && g.body.round.round === 1 && g.body.standings.length === 8, "GET game → round 1 + standings");

const noAuth = await req("POST", `/api/v1/games/${code}/scores`, { court: 1, scoreA: 15 });
assert(noAuth.status === 401, "scoring without key → 401");
const wrong = await req("POST", `/api/v1/games/${code}/scores`, { court: 1, scoreA: 15 }, "x".repeat(22));
assert(wrong.status === 403, "scoring with wrong key → 403");

const s1 = await req("POST", `/api/v1/games/${code}/scores`, { court: 1, scoreA: 15 }, organizerKey);
assert(s1.status === 200 && s1.body.round.matches[0].scoreB === 9 && !s1.body.roundComplete, "score 15 → 15–9, round not complete");
const early = await req("POST", `/api/v1/games/${code}/next`, null, organizerKey);
assert(early.status === 409, "next before all scores → 409");
const s2 = await req("POST", `/api/v1/games/${code}/scores`, { court: 2, scoreB: 20 }, organizerKey);
assert(s2.body.roundComplete, "court 2 scored → round complete");
const n = await req("POST", `/api/v1/games/${code}/next`, null, organizerKey);
assert(n.status === 200 && n.body.round.round === 2, "next → round 2");
const r1 = await req("GET", `/api/v1/games/${code}/rounds/1`);
assert(r1.status === 200 && r1.body.matches.length === 2, "GET round 1");
const st = await req("GET", `/api/v1/games/${code}/standings`);
assert(st.body.standings[0].score === 20, `standings leader ${st.body.standings[0].name} (20)`);
const f = await req("POST", `/api/v1/games/${code}/finish`, null, organizerKey);
assert(f.status === 200 && f.body.podium.length === 3, `finished, winner ${f.body.podium[0]}`);
console.log("\nALL PASSED", code);
