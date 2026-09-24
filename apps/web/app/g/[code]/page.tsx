import type { Metadata } from "next";
import { GameView } from "@/components/game/game-view";
import { normalizeCode } from "@/lib/games/code";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Game ${normalizeCode(code)}`,
    description: "Live padel game: rounds, scores and leaderboard.",
    robots: { index: false, follow: true },
  };
}

export default async function GamePage({ params }: Props) {
  const { code } = await params;
  return <GameView code={normalizeCode(code)} />;
}
