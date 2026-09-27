"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

/** Mounted once in the root layout: starts Amplitude on the client. */
export function Analytics() {
  useEffect(() => initAnalytics(), []);
  return null;
}
