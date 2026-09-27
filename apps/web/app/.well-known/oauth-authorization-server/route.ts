import { forwardToMcp } from "@/lib/cloud-server";

/** OAuth authorization server metadata (RFC 8414) for /mcp/account, served by apps/mcp. */
export const dynamic = "force-dynamic";

export const GET = forwardToMcp;
export const OPTIONS = forwardToMcp;
