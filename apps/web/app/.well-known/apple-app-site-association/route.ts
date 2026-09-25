import { APP_LINK_PATHS, IOS_BUNDLE_ID, appleTeamId } from "@/lib/native-apps";

/** Universal Links: lets the iOS app open https game links (served without a file extension). */
export const dynamic = "force-dynamic";

export function GET() {
  const team = appleTeamId();
  if (!team) return new Response("Not configured", { status: 404 });
  const appID = `${team}.${IOS_BUNDLE_ID}`;
  return Response.json(
    {
      applinks: { details: [{ appIDs: [appID], components: APP_LINK_PATHS.map((p) => ({ "/": p })) }] },
      activitycontinuation: { apps: [appID] },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
