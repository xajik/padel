import { forwardToMcp } from "@/lib/cloud-server";

/** REST game API (create / read / score / next / finish), served by the apps/mcp Worker. See /openapi.json. */
export const dynamic = "force-dynamic";

export const GET = forwardToMcp;
export const POST = forwardToMcp;
export const OPTIONS = forwardToMcp;
