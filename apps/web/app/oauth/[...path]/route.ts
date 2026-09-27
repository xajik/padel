import { forwardToMcp } from "@/lib/cloud-server";

/** OAuth server for /mcp/account (authorize, token, register, callback), run by apps/mcp. */
export const dynamic = "force-dynamic";

export const GET = forwardToMcp;
export const POST = forwardToMcp;
export const OPTIONS = forwardToMcp;
