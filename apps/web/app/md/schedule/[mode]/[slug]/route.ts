import { notFound } from "next/navigation";
import { markdownResponse, scheduleMarkdownPage } from "@/lib/content/markdown";
import { buildSchedule, isModeId, parseScheduleSlug, scheduleCombos, scheduleSlug, SCHEDULE_MODES } from "@/lib/schedule";

export const dynamic = "force-static";
export const generateStaticParams = () =>
  scheduleCombos().map((c) => ({ mode: c.mode, slug: scheduleSlug(c.players, c.courts) }));

export async function GET(_req: Request, { params }: { params: Promise<{ mode: string; slug: string }> }) {
  const { mode, slug } = await params;
  const parsed = parseScheduleSlug(slug);
  if (!parsed || !isModeId(mode) || !SCHEDULE_MODES.includes(mode)) notFound();
  try {
    return markdownResponse(scheduleMarkdownPage(buildSchedule({ mode, ...parsed })), `/schedule/${mode}/${slug}`);
  } catch {
    notFound();
  }
}
