import { notFound } from "next/navigation";
import { MODE_GUIDES, modeGuide } from "@padel/content";
import { markdownResponse, modeMarkdown } from "@/lib/content/markdown";

export const dynamic = "force-static";
export const generateStaticParams = () => MODE_GUIDES.map((g) => ({ mode: g.id }));

export async function GET(_req: Request, { params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  const guide = modeGuide(mode);
  if (!guide) notFound();
  return markdownResponse(modeMarkdown(guide), `/modes/${mode}`);
}
