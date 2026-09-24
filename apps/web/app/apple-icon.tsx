import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 84, height: 104, border: "8px solid #fff", borderRadius: 16, display: "flex", alignItems: "center", position: "relative" }}>
          <div style={{ width: "100%", height: 8, background: "#fff" }} />
          <div style={{ position: "absolute", right: 10, width: 22, height: 22, borderRadius: 11, background: "#fff" }} />
        </div>
      </div>
    ),
    size,
  );
}
