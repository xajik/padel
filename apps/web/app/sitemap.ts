import type { MetadataRoute } from "next";
import { MODE_GUIDES } from "@padel/content";
import { scheduleCombos, scheduleSlug } from "@/lib/schedule";
import { absoluteUrl } from "@/lib/site";

const UPDATED = new Date("2026-09-24");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), lastModified: UPDATED, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/modes"), lastModified: UPDATED, priority: 0.9 },
    ...MODE_GUIDES.map((g) => ({ url: absoluteUrl(`/modes/${g.id}`), lastModified: UPDATED, priority: 0.9 })),
    { url: absoluteUrl("/schedule"), lastModified: UPDATED, priority: 0.8 },
    ...scheduleCombos().map((c) => ({
      url: absoluteUrl(`/schedule/${c.mode}/${scheduleSlug(c.players, c.courts)}`),
      lastModified: UPDATED,
      priority: 0.6,
    })),
    { url: absoluteUrl("/docs/mcp"), lastModified: UPDATED, priority: 0.5 },
    { url: absoluteUrl("/privacy"), lastModified: UPDATED, priority: 0.2 },
  ];
}
