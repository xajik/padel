"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { modeInfo } from "@padel/engine";
import { Badge } from "@/components/ui/badge";
import { Icon, MODE_ICONS } from "@/components/icons/icon";
import { gameRepository, type StoredGame } from "@/lib/games";

/** Games on this device (guest history, FR-5.2). Renders nothing when empty. */
export function RecentGames({ limit = 3, title = "Your games" }: { limit?: number; title?: string }) {
  const [games, setGames] = useState<StoredGame[] | null>(null);

  useEffect(() => {
    const repo = gameRepository();
    void repo.list().then((g) => setGames(g.slice(0, limit)));
  }, [limit]);

  if (!games?.length) return null;
  return (
    <section aria-labelledby="recent-title" className="space-y-3">
      <h2 id="recent-title" className="text-sm font-medium text-muted-foreground">
        {title}
      </h2>
      <ul className="divide-y rounded-xl border bg-card">
        {games.map((g) => (
          <li key={g.code}>
            <Link href={`/g/${g.code}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
              <Icon name={MODE_ICONS[g.state.settings.mode]} size={20} className="text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{g.name}</p>
                <p className="text-sm text-muted-foreground">
                  {modeInfo(g.state.settings.mode).name} · {g.state.players.length} players ·{" "}
                  {new Date(g.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </p>
              </div>
              {g.status === "live" ? <Badge>Live</Badge> : <Badge variant="outline">Finished</Badge>}
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
