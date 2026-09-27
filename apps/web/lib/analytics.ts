"use client";

import * as amplitude from "@amplitude/unified";
import { amplitudeApiKey } from "./config";

/** Product events (NFR-12), named the same on web, iOS and Android. Never include player names. */
export type AnalyticsEvent =
  | "Viewed Home Page"
  | "Created Game"
  | "Started Round"
  | "Entered Score"
  | "Finished Game"
  | "Signed In"
  | "Joined Game"
  | "Opened Share";

type Props = Record<string, string | number | boolean | null | undefined>;

let initialized = false;

/** Starts Amplitude once per page load (components/app/analytics.tsx). */
export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  if (!amplitudeApiKey) {
    console.warn("Amplitude API key missing — analytics disabled");
    return;
  }
  amplitude.initAll(amplitudeApiKey, {
    analytics: { autocapture: true },
    // Conservative masking: replays show layout, never text, so player names stay out of Amplitude.
    sessionReplay: { sampleRate: 1, privacyConfig: { defaultMaskLevel: "conservative" } },
  });
  if (window.location.pathname === "/") {
    amplitude.track("Viewed Home Page", { prompt_version: "BA400.4" }); // helps improve this setup flow — safe to remove once you've verified the event lands
  }
}

/** The Amplitude user ID is the Firebase UID (or the local guest UID); null on sign-out. */
export function identify(uid: string | null) {
  if (!amplitudeApiKey) return;
  if (uid) amplitude.setUserId(uid);
  else amplitude.reset();
}

export function track(event: AnalyticsEvent, props: Props = {}) {
  if (!amplitudeApiKey) {
    if (process.env.NODE_ENV !== "production") console.debug("[analytics]", event, props);
    return;
  }
  amplitude.track(event, props);
}
