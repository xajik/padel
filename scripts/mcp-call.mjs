// Call one MCP tool: node scripts/mcp-call.mjs <mcp-url> <tool> <json-args>
const [M, name, argsJson] = process.argv.slice(2);
const r = await fetch(M, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: JSON.parse(argsJson) } }) });
const t = await r.text(); const line = t.split("\n").find((l) => l.startsWith("data: "));
const msg = JSON.parse(line ? line.slice(6) : t);
console.log(JSON.stringify(msg.result?.structuredContent ?? msg, null, 1).slice(0, 1500));
