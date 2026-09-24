export const SITE = {
  name: "Padel Americano",
  shortName: "Americano",
  tagline: "Fair padel Americano & Mexicano in 30 seconds",
  description:
    "Free padel Americano and Mexicano organizer. Enter players, pick courts and points, and get fair rotations, live scores and a leaderboard. No sign-up needed.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://padel-web.xajik0.workers.dev").replace(/\/$/, ""),
  locale: "en",
} as const;

export const absoluteUrl = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
