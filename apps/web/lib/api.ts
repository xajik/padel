export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function json(data: unknown, init: ResponseInit & { cache?: string } = {}) {
  return Response.json(data, {
    ...init,
    headers: { ...CORS, "Cache-Control": init.cache ?? "public, max-age=300, s-maxage=3600", ...init.headers },
  });
}

export function apiError(status: number, code: string, message: string, hint?: string) {
  return json({ error: { code, message, ...(hint ? { hint } : {}) } }, { status, cache: "no-store" });
}
