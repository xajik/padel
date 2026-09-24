import { ImageResponse } from "next/og";
import { iconDataUri } from "@padel/design";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconDataUri("logo", "#fafafa", 120)} width={120} height={120} alt="" />
      </div>
    ),
    size,
  );
}
