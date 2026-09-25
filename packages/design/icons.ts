/**
 * Custom padel icon set. 24×24 viewBox, outline, stroke = currentColor.
 * Each icon is SVG child markup so it can be rendered by React on the web and
 * exported to .svg files for the native apps and design tools via `npm run icons`.
 */
export const ICONS = {
  /** Brand mark: a perforated padel racket leaning right, with a ball (tennis-style seam). */
  logo: `<g transform="rotate(35 12 12)" fill="currentColor" stroke="none" fill-rule="evenodd"><path d="M12 1.5C16 1.5 18.5 4.2 18.5 7.8C18.5 11.8 15.6 14.5 12 14.5C8.4 14.5 5.5 11.8 5.5 7.8C5.5 4.2 8 1.5 12 1.5ZM9.28 4.6a0.72 0.72 0 1 0 1.44 0a0.72 0.72 0 1 0 -1.44 0ZM11.28 4.6a0.72 0.72 0 1 0 1.44 0a0.72 0.72 0 1 0 -1.44 0ZM13.28 4.6a0.72 0.72 0 1 0 1.44 0a0.72 0.72 0 1 0 -1.44 0ZM8.28 7a0.72 0.72 0 1 0 1.44 0a0.72 0.72 0 1 0 -1.44 0ZM10.28 7a0.72 0.72 0 1 0 1.44 0a0.72 0.72 0 1 0 -1.44 0ZM12.28 7a0.72 0.72 0 1 0 1.44 0a0.72 0.72 0 1 0 -1.44 0ZM14.28 7a0.72 0.72 0 1 0 1.44 0a0.72 0.72 0 1 0 -1.44 0ZM9.28 9.4a0.72 0.72 0 1 0 1.44 0a0.72 0.72 0 1 0 -1.44 0ZM11.28 9.4a0.72 0.72 0 1 0 1.44 0a0.72 0.72 0 1 0 -1.44 0ZM13.28 9.4a0.72 0.72 0 1 0 1.44 0a0.72 0.72 0 1 0 -1.44 0ZM10.28 11.7a0.72 0.72 0 1 0 1.44 0a0.72 0.72 0 1 0 -1.44 0ZM12.28 11.7a0.72 0.72 0 1 0 1.44 0a0.72 0.72 0 1 0 -1.44 0Z"/><path d="M9.4 13.6L14.6 13.6L13.1 17.2L10.9 17.2Z M11.1 14.5L12.9 14.5L12 16.3Z"/><path d="M11 17a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v5.3a1 1 0 0 1-1 1h0a1 1 0 0 1-1-1Z"/></g><g transform="rotate(35 19 19.4)"><circle cx="19" cy="19.4" r="2.9"/><path d="M17.35 17.05a2.7 2.7 0 0 1 0 4.7M20.65 17.05a2.7 2.7 0 0 0 0 4.7" stroke-width="1.15"/></g>`,
  racket: `<path d="M12 2.75c3.6 0 6.25 2.6 6.25 6.1 0 3.9-3 6.4-6.25 6.4s-6.25-2.5-6.25-6.4c0-3.5 2.65-6.1 6.25-6.1Z"/><path d="M10.4 15l-.6 2.2h4.4l-.6-2.2"/><path d="M10.4 17.2h3.2V21a1.6 1.6 0 0 1-3.2 0Z"/><circle cx="10" cy="7.5" r=".6" fill="currentColor" stroke="none"/><circle cx="14" cy="7.5" r=".6" fill="currentColor" stroke="none"/><circle cx="12" cy="9.5" r=".6" fill="currentColor" stroke="none"/><circle cx="10" cy="11.5" r=".6" fill="currentColor" stroke="none"/><circle cx="14" cy="11.5" r=".6" fill="currentColor" stroke="none"/>`,
  ball: `<circle cx="12" cy="12" r="9"/><path d="M5.2 6.2c2.6 1.7 4.2 3.8 4.2 5.8s-1.6 4.1-4.2 5.8"/><path d="M18.8 6.2c-2.6 1.7-4.2 3.8-4.2 5.8s1.6 4.1 4.2 5.8"/>`,
  court: `<rect x="4" y="2.5" width="16" height="19" rx="1.5"/><path d="M4 12h16"/><path d="M4 7h16M4 17h16M12 7v10" opacity=".55"/>`,
  /** Americano: partners rotate. */
  rotate: `<circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><path d="M5.5 7.5A7.5 7.5 0 0 1 18 6.4"/><path d="M18.5 3.8V6.9h-3.1"/><path d="M18.5 16.5A7.5 7.5 0 0 1 6 17.6"/><path d="M5.5 20.2v-3.1h3.1"/>`,
  /** Fixed pairs. */
  pair: `<circle cx="8.5" cy="8" r="3"/><circle cx="15.5" cy="8" r="3"/><path d="M3 20c.4-3.4 2.7-5.5 5.5-5.5 1.4 0 2.6.5 3.5 1.4.9-.9 2.1-1.4 3.5-1.4 2.8 0 5.1 2.1 5.5 5.5"/>`,
  /** Mexicano: grouped by standings. */
  ladder: `<path d="M4 20h16"/><rect x="5" y="13" width="3.5" height="7" rx=".8"/><rect x="10.25" y="9" width="3.5" height="11" rx=".8"/><rect x="15.5" y="4" width="3.5" height="16" rx=".8"/>`,
  /** Mixicano: two sides. */
  mixed: `<circle cx="7.5" cy="9" r="3.5"/><circle cx="16.5" cy="9" r="3.5" fill="currentColor" fill-opacity=".18"/><path d="M4 20c.5-2.7 2-4 3.5-4s3 1.3 3.5 4M13 20c.5-2.7 2-4 3.5-4s3 1.3 3.5 4"/>`,
  /** Beat the Box: groups of four. */
  box: `<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.6"/><circle cx="15.5" cy="8.5" r="1.6"/><circle cx="8.5" cy="15.5" r="1.6"/><circle cx="15.5" cy="15.5" r="1.6" fill="currentColor"/>`,
  /** Up & Down: court ladder. */
  updown: `<path d="M8 20V5M4.5 8.5 8 5l3.5 3.5"/><path d="M16 4v15M12.5 15.5 16 19l3.5-3.5"/>`,
  podium: `<path d="M3 20h18"/><rect x="9" y="8" width="6" height="12" rx=".8"/><rect x="3.5" y="12" width="5.5" height="8" rx=".8"/><rect x="15" y="14.5" width="5.5" height="5.5" rx=".8"/><path d="M12 3.2l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 5.3l2-.3Z"/>`,
  scoreboard: `<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M12 5v14"/><path d="M6 10.5c0-1 .7-1.7 1.6-1.7s1.6.7 1.6 1.6c0 1.6-3.2 2.4-3.2 4.8h3.2"/><path d="M15.5 9.8l1.7-1v6.4"/>`,
  leaderboard: `<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 5l1.2-.8V8"/><path d="M3.8 11.2c.2-.6.7-.9 1.3-.9.7 0 1.2.5 1.2 1.1 0 1.1-2.5 1.5-2.5 3.1h2.5" opacity=".75"/><path d="M4 17.4c.3-.3.7-.5 1.1-.5.6 0 1.1.4 1.1 1s-.5 1-1.1 1c.6 0 1.1.4 1.1 1s-.5 1-1.1 1c-.5 0-.9-.2-1.2-.6" opacity=".5"/>`,
  sitout: `<path d="M6 11V5.5A1.5 1.5 0 0 1 7.5 4h9A1.5 1.5 0 0 1 18 5.5V11"/><path d="M4 11h16v3H4Z"/><path d="M6 14v6M18 14v6"/>`,
  timer: `<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M10 2.5h4M18.5 6.5l1.5-1.5"/>`,
  share: `<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1"/>`,
  group: `<circle cx="12" cy="7.5" r="3"/><circle cx="5.5" cy="10" r="2.2"/><circle cx="18.5" cy="10" r="2.2"/><path d="M6.5 20c.4-3.3 2.6-5.2 5.5-5.2s5.1 1.9 5.5 5.2M2.5 18.5c.3-1.9 1.4-3 2.9-3.2M21.5 18.5c-.3-1.9-1.4-3-2.9-3.2"/>`,
  agent: `<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 7V4M9.5 4h5"/><circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none"/><path d="M2 12v2M22 12v2"/>`,
} as const;

export type IconName = keyof typeof ICONS;

export function iconSvg(name: IconName, size = 24, strokeWidth = 1.75): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

/** Standalone SVG string in a fixed colour (for <img> data URIs in OG images / app icons). */
export function iconSvgColored(name: IconName, color: string, size = 24): string {
  return iconSvg(name, size).replace(/currentColor/g, color);
}

export function iconDataUri(name: IconName, color: string, size = 24): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(iconSvgColored(name, color, size))}`;
}
