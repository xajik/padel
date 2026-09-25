import { ANDROID_PACKAGE, androidFingerprints } from "@/lib/native-apps";

/** Android App Links verification for https game links. */
export const dynamic = "force-dynamic";

export function GET() {
  const fingerprints = androidFingerprints();
  const body = fingerprints.length
    ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: fingerprints } }]
    : [];
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
