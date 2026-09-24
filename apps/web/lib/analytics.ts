"use client";

import { isAmplitudeConfigured } from "./config";

/** Product events (NFR-12). Never include player names. */
export type AnalyticsEvent =
  | "game_created"
  | "round_started"
  | "score_entered"
  | "game_finished"
  | "sign_in"
  | "join_game"
  | "play_again"
  | "share_opened"
  | "schedule_page_viewed";

type Props = Record<string, string | number | boolean | null | undefined>;

let userId: string | null = null;

export function identify(uid: string | null) {
  userId = uid;
  // TODO(amplitude): amplitude.setUserId(uid) once NEXT_PUBLIC_AMPLITUDE_API_KEY is provided.
}

export function track(event: AnalyticsEvent, props: Props = {}) {
  if (isAmplitudeConfigured) {
    // TODO(amplitude): lazy-load @amplitude/analytics-browser, init with amplitudeApiKey and call track().
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics]", event, { ...props, userId });
  }
}
