import { ImageResponse } from "next/og";
import { SITE } from "./site";

export const OG_SIZE = { width: 1200, height: 630 };

/** Black-and-white social card (FR-7.2.2). */
export function ogCard({ eyebrow, title, footer }: { eyebrow: string; title: string; footer?: string }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0a0a0a", color: "#fafafa", display: "flex", flexDirection: "column", padding: 72, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 30 }}>
          <div style={{ width: 52, height: 64, border: "5px solid #fafafa", borderRadius: 10, display: "flex", alignItems: "center", position: "relative" }}>
            <div style={{ width: "100%", height: 5, background: "#fafafa" }} />
            <div style={{ position: "absolute", right: 6, width: 14, height: 14, borderRadius: 7, background: "#fafafa" }} />
          </div>
          {SITE.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 30, color: "#a3a3a3" }}>{eyebrow}</div>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>{title}</div>
        </div>
        <div style={{ fontSize: 26, color: "#a3a3a3", display: "flex" }}>{footer ?? "Free · No sign-up · Americano, Mexicano and more"}</div>
      </div>
    ),
    OG_SIZE,
  );
}
