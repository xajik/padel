import { forwardToMcp } from "@/lib/cloud-server";

/** Remote MCP endpoint (FR-8.1.1), served by the apps/mcp Worker through a service binding. */
export const dynamic = "force-dynamic";

export const GET = forwardToMcp;
export const POST = forwardToMcp;
export const DELETE = forwardToMcp;
export const OPTIONS = forwardToMcp;
