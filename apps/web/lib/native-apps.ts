/**
 * The native apps (apps/ios, apps/android) that open game links (`/g/{code}`, `/join`) when
 * installed. Identity comes from Worker vars (wrangler.jsonc):
 *   APPLE_TEAM_ID        Apple Developer Team ID; the Apple file is served only once it is set.
 *   ANDROID_CERT_SHA256  comma-separated SHA-256 fingerprints of the app signing certificates.
 */
export const IOS_BUNDLE_ID = "app.americanoo.ios";
export const ANDROID_PACKAGE = "app.americanoo.android";
/** Paths the apps handle; everything else stays on the web. */
export const APP_LINK_PATHS = ["/g/*", "/join", "/join/*"];

export const appleTeamId = () => process.env.APPLE_TEAM_ID?.trim() || null;

export const androidFingerprints = () =>
  (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
