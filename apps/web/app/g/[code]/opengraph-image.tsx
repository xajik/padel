import { computeStandings, modeInfo } from "@padel/engine";
import { getCloudGame } from "@/lib/cloud-server";
import { normalizeCode } from "@/lib/games/code";
import { ogCard, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Live padel game";

/** Link preview for WhatsApp/Slack (AC-17): game name and current top 3. */
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code);
  const game = await getCloudGame(code);
  if (!game) return ogCard({ eyebrow: `Game ${code}`, title: "Follow the scores live." });
  const top = computeStandings(game.state).slice(0, 3);
  const played = top.some((s) => s.played);
  return ogCard({
    eyebrow: `${modeInfo(game.state.settings.mode).name} · ${game.status === "done" ? "Final" : `Round ${game.state.current + 1}`}`,
    title: game.name,
    footer: played ? top.map((s) => `${s.rank}. ${s.name} ${s.score}`).join("   ·   ") : `${game.state.players.length} players · code ${code}`,
  });
}
