import type { Metadata } from "next";
import { computeStandings, modeInfo } from "@padel/engine";
import { GameView } from "@/components/game/game-view";
import { getCloudGame } from "@/lib/cloud-server";
import { normalizeCode } from "@/lib/games/code";

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ key?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = normalizeCode((await params).code);
  const game = await getCloudGame(code);
  if (!game) {
    return { title: `Game ${code}`, description: "Live padel game: rounds, scores and leaderboard.", robots: { index: false, follow: true } };
  }
  const top = computeStandings(game.state).slice(0, 3);
  const description =
    top.some((s) => s.played)
      ? `${game.status === "done" ? "Final" : `After round ${game.state.current + 1}`}: ${top.map((s) => `${s.rank}. ${s.name} (${s.score})`).join(", ")}`
      : `${modeInfo(game.state.settings.mode).name} · ${game.state.players.length} players · ${game.state.settings.courts} courts. Follow the scores live.`;
  return {
    title: game.name,
    description,
    robots: { index: false, follow: true },
    openGraph: { title: game.name, description },
  };
}

export default async function GamePage({ params, searchParams }: Props) {
  const code = normalizeCode((await params).code);
  const { key } = await searchParams;
  // Cloud games (created by AI assistants) render on the server; device-local games hydrate on the client.
  const initial = await getCloudGame(code);
  return <GameView code={code} initial={initial} keyFromUrl={key ?? null} />;
}
