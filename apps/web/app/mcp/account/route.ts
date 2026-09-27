import { forwardToMcp } from "@/lib/cloud-server";

/** Signed-in MCP endpoint (FR-8.1.6): OAuth with the user's Americanoo account, served by apps/mcp. */
export const dynamic = "force-dynamic";

export const GET = forwardToMcp;
export const POST = forwardToMcp;
export const DELETE = forwardToMcp;
export const OPTIONS = forwardToMcp;
