import { forwardToMcp } from "@/lib/cloud-server";

/** OAuth protected resource metadata (RFC 9728) for /mcp/account, served by apps/mcp. */
export const dynamic = "force-dynamic";

export const GET = forwardToMcp;
export const OPTIONS = forwardToMcp;
