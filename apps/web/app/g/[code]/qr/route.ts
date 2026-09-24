import QRCode from "qrcode";
import { normalizeCode } from "@/lib/games/code";
import { absoluteUrl } from "@/lib/site";

/** Printable QR code for a game's spectator link. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code);
  const svg = await QRCode.toString(absoluteUrl(`/g/${code}`), { type: "svg", margin: 2, color: { dark: "#0a0a0a", light: "#ffffff" } });
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400", "X-Robots-Tag": "noindex" },
  });
}
