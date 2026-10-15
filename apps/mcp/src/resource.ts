const ACCOUNT_MCP = "/mcp/account";

/**
 * Clients derive the OAuth `resource` from the URL the user typed, which is often the anonymous /mcp, the origin
 * or a trailing-slash spelling. The provider wants the exact canonical resource, so map those aliases to it.
 */
export function canonicalResource(value: string, site: string): string {
  const canonical = `${site}${ACCOUNT_MCP}`;
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return value;
  }
  if (u.origin !== new URL(site).origin || u.search || u.hash) return value;
  const path = u.pathname.replace(/\/+$/, "");
  return path === "" || path === "/mcp" || path === ACCOUNT_MCP ? canonical : value;
}

