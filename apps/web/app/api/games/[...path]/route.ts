import { forwardToMcp } from "@/lib/cloud-server";

/** Cloud game API (read, redeem organizer key, mutate), backed by the apps/mcp Worker. */
export const dynamic = "force-dynamic";

export const GET = forwardToMcp;
export const POST = forwardToMcp;
export const OPTIONS = forwardToMcp;
