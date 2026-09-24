import { ogCard, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Run a fair padel Americano in 30 seconds";

export default function Image() {
  return ogCard({ eyebrow: "Padel organizer", title: "Run a fair padel Americano in 30 seconds." });
}
