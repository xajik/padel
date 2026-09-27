import { forwardToMcp } from "@/lib/cloud-server";

/** Account API (my games, merge, delete), backed by the apps/mcp Worker. Needs a Firebase ID token. */
export const dynamic = "force-dynamic";

export const GET = forwardToMcp;
export const POST = forwardToMcp;
export const DELETE = forwardToMcp;
export const OPTIONS = forwardToMcp;
