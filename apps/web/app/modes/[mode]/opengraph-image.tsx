import { modeInfo, MODES, type ModeId } from "@padel/engine";
import { ogCard, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Padel format guide";
export const generateStaticParams = () => MODES.map((m) => ({ mode: m.id }));

export default async function Image({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  const info = modeInfo(mode as ModeId);
  return ogCard({ eyebrow: "Format guide", title: `How ${info.name} works`, footer: info.summary });
}
