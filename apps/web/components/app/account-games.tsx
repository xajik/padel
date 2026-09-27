"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Icon, MODE_ICONS } from "@/components/icons/icon";
import { fetchAccountGames, type AccountGame } from "@/lib/games/cloud";
import { useAuth } from "./auth-provider";

/** Games in the signed-in user's account: shared from any browser, the apps or an AI assistant. */
export function AccountGames({ title = "In your account" }: { title?: string }) {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState<{ uid: string; games: AccountGame[] } | null>(null);
  const signedIn = user?.isAnonymous === false;
  const uid = signedIn ? user.uid : null;
  const games = loaded && loaded.uid === uid ? loaded.games : null;

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    void fetchAccountGames().then((g) => alive && setLoaded({ uid, games: g }));
    return () => {
      alive = false;
    };
  }, [uid]);

  if (!games?.length) return null;
  return (
    <section aria-labelledby="account-title" className="space-y-3">
      <h2 id="account-title" className="text-sm font-medium text-muted-foreground">
        {title}
      </h2>
      <ul className="divide-y rounded-xl border bg-card">
        {games.map((g) => (
          <li key={g.code}>
            <Link href={`/g/${g.code}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
              <Icon name={MODE_ICONS[g.mode]} size={20} className="text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{g.name}</p>
                <p className="text-sm text-muted-foreground">
                  {g.modeName} · {g.players.length} players ·{" "}
                  {new Date(g.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
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
