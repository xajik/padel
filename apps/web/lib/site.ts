export const SITE = {
  name: "Padel Americano",
  shortName: "Americano",
  tagline: "Fair padel Americano & Mexicano in 30 seconds",
  description:
    "Free padel Americano and Mexicano organizer. Enter players, pick courts and points, and get fair rotations, live scores and a leaderboard. No sign-up needed.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://padel-americanoo.com").replace(/\/$/, ""),
  locale: "en",
} as const;

/** Operator named on the legal pages, and the public contact for support, privacy and terms. */
export const LEGAL = {
  publisher: "Americanoo",
  email: "support@padel-americanoo.com",
  updated: "September 26, 2026",
} as const;

/** The native apps. Store links stay null until the listings are live (the /app page hides the badges). */
export const NATIVE_APP = {
  name: "Americanoo",
  storeName: "Americanoo: Padel Score",
  appStoreUrl: null as string | null,
  playStoreUrl: null as string | null,
} as const;

export const absoluteUrl = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
