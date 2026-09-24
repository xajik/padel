"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Flag, RotateCcw, Shuffle } from "lucide-react";
import { toast } from "sonner";
import {
  advanceStatus,
  computeStandings,
  EngineError,
  isRoundComplete,
  isScored,
  modeInfo,
  nextRound,
  setScore,
  swapPlayers,
  type Standing,
} from "@padel/engine";
import { useAuth } from "@/components/app/auth-provider";
import { Icon } from "@/components/icons/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { track } from "@/lib/analytics";
import type { StoredGame } from "@/lib/games";
import { useGame } from "@/lib/games/use-game";
import { cn } from "@/lib/utils";
import { CourtCard } from "./court-card";
import { Leaderboard } from "./leaderboard";
import { Podium } from "./podium";
import { ScorePad, type PadTarget } from "./score-pad";
import { ShareDialog } from "./share-dialog";

export function GameView({ code }: { code: string }) {
  const { load, save } = useGame(code);
  if (load.status === "loading") return <GameSkeleton />;
  if (load.status === "missing") return <GameMissing code={code} />;
  return <LoadedGame game={load.game} save={save} />;
}

function LoadedGame({ game, save }: { game: StoredGame; save: (g: StoredGame) => Promise<void> }) {
  const { user } = useAuth();
  const { state } = game;
  const info = modeInfo(state.settings.mode);
  const [viewRound, setViewRound] = useState(state.current);
  const [tab, setTab] = useState(game.status === "done" ? "leaderboard" : "round");
  const [pad, setPad] = useState<PadTarget | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [swapMode, setSwapMode] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  const canEdit = !!user && user.uid === game.ownerUid && game.status === "live";
  const names = useMemo(() => {
    const m = new Map(state.players.map((p) => [p.id, p.name]));
    return (id: string) => m.get(id) ?? "?";
  }, [state.players]);
  const standings = useMemo(() => computeStandings(state), [state]);
  const round = state.rounds[Math.min(viewRound, state.current)];
  const status = advanceStatus(state);
  const totalRounds = state.plannedRounds;
  const roundUnscored = !round.matches.some(isScored);
  const canSwap = canEdit && state.settings.shuffle === "manual" && viewRound === state.current && roundUnscored;

  const persist = (next: StoredGame) => save({ ...next, updatedAt: Date.now() });

  const applyScore = (matchIndex: number, a: number | null, b: number | null) => {
    setPad(null);
    try {
      const res = setScore(state, round.index, matchIndex, a, b);
      void persist({ ...game, state: res.state });
      if (a !== null) track("score_entered", { round: round.index + 1 });
      if (res.regenerated.length) {
        toast("Later rounds reshuffled", {
          description: `Round ${res.regenerated.map((i) => i + 1).join(", ")} now uses the updated standings.`,
        });
      }
    } catch (e) {
      toast.error(e instanceof EngineError ? e.message : "Could not save that score.");
    }
  };

  const goNext = () => {
    try {
      const next = nextRound(state);
      void persist({ ...game, state: next });
      setViewRound(next.current);
      setTab("round");
      track("round_started", { round: next.current + 1 });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e instanceof EngineError ? e.message : "Could not start the next round.");
    }
  };

  const finish = () => {
    void persist({ ...game, status: "done" });
    setTab("leaderboard");
    track("game_finished", { rounds: state.current + 1, mode: state.settings.mode });
  };

  const pickForSwap = (id: string) => {
    if (!picked) return setPicked(id);
    if (picked !== id) {
      void persist({ ...game, state: swapPlayers(state, round.index, picked, id) });
    }
    setPicked(null);
  };

  const standingsText = [
    `${game.name}: ${game.status === "done" ? "final standings" : `after round ${state.current + 1}`}`,
    ...standings.map((s) => `${s.rank}. ${s.name} (${s.score})`),
  ].join("\n");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-5 pb-36">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">{game.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {info.name} · {state.players.length} players · {state.settings.courts} court{state.settings.courts > 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" className="h-10 shrink-0 gap-2" onClick={() => setShareOpen(true)}>
          <Icon name="share" size={16} />
          <span className="font-mono tracking-widest">{game.code}</span>
        </Button>
      </header>

      {game.status === "done" && (
        <div className="mb-5">
          <Podium rows={standings} />
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 grid h-11 w-full grid-cols-3">
          <TabsTrigger value="round" className="gap-1.5">
            <Icon name="scoreboard" size={16} /> Round
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-1.5">
            <Icon name="leaderboard" size={16} /> Leaderboard
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5">
            <Icon name="court" size={16} /> Rounds
          </TabsTrigger>
        </TabsList>

        <TabsContent value="round" className="space-y-3">
          <RoundPicker
            count={state.current + 1}
            planned={totalRounds}
            value={Math.min(viewRound, state.current)}
            onChange={(i) => {
              setViewRound(i);
              setSwapMode(false);
            }}
          />

          {canSwap && (
            <div className="flex items-center justify-between rounded-xl border border-dashed p-3 text-sm">
              <span className="text-muted-foreground">
                {swapMode ? (picked ? `Now tap who ${names(picked)} swaps with.` : "Tap a player to move.") : "Rearrange this round before it starts."}
              </span>
              <Button
                variant={swapMode ? "default" : "outline"}
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => {
                  setSwapMode(!swapMode);
                  setPicked(null);
                }}
              >
                <Shuffle className="size-4" /> {swapMode ? "Done" : "Rearrange"}
              </Button>
            </div>
          )}

          {round.matches.map((m, i) => (
            <CourtCard
              key={`${round.index}-${m.court}`}
              match={m}
              names={names}
              scoring={state.settings.scoring}
              editable={canEdit}
              swapMode={swapMode}
              selected={picked}
              onPickPlayer={pickForSwap}
              onScore={(side) =>
                setPad({
                  matchIndex: i,
                  side,
                  teamNames: [m.teamA.map(names).join(" & "), m.teamB.map(names).join(" & ")],
                  current: [m.scoreA, m.scoreB],
                })
              }
              onResult={(a, b) => applyScore(i, a, b)}
            />
          ))}

          {round.byes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm">
              <Icon name="sitout" size={18} className="text-muted-foreground" />
              <span className="text-muted-foreground">Sitting out:</span>
              {round.byes.map((id) =>
                swapMode ? (
                  <button
                    key={id}
                    type="button"
                    onClick={() => pickForSwap(id)}
                    className={cn(
                      "rounded-md border border-dashed px-1.5 py-0.5",
                      picked === id && "border-solid border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {names(id)}
                  </button>
                ) : (
                  <span key={id} className="font-medium">
                    {names(id)}
                  </span>
                ),
              )}
            </div>
          )}

          <section aria-label="Top of the leaderboard" className="pt-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Leaderboard</h2>
              <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setTab("leaderboard")}>
                See all
              </button>
            </div>
            <Leaderboard rows={standings.slice(0, 4)} mode={state.settings.leaderboard} compact />
          </section>
        </TabsContent>

        <TabsContent value="leaderboard">
          <Leaderboard rows={standings} mode={state.settings.scoring.type === "off" ? "wins" : state.settings.leaderboard} />
          <p className="mt-3 text-xs text-muted-foreground">
            {info.teams ? "Per team." : "Per player."} P = matches played. Ties are split by point difference, then wins.
          </p>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-2">
          {state.rounds.map((r) => (
            <div key={r.index} className={cn("rounded-xl border p-3", r.index === state.current && game.status === "live" && "border-foreground")}>
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Round {r.index + 1}</span>
                {r.index < state.current || isRoundComplete(r) ? <span>Played</span> : r.index === state.current ? <Badge variant="outline">Now</Badge> : <span>Up next</span>}
              </div>
              <ul className="space-y-1 text-sm">
                {r.matches.map((m) => (
                  <li key={m.court} className="flex items-center gap-2">
                    <span className="w-6 font-mono text-xs text-muted-foreground">C{m.court}</span>
                    <span className="flex-1">
                      {m.teamA.map(names).join(" & ")} <span className="text-muted-foreground">vs</span> {m.teamB.map(names).join(" & ")}
                    </span>
                    {m.scoreA !== null && (
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {m.scoreA}–{m.scoreB}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {r.byes.length > 0 && <p className="mt-1.5 text-xs text-muted-foreground">Sitting out: {r.byes.map(names).join(", ")}</p>}
            </div>
          ))}
          {info.dynamic && game.status === "live" && (
            <p className="text-sm text-muted-foreground">Next rounds are drawn from the standings when this round ends.</p>
          )}
        </TabsContent>
      </Tabs>

      <ActionBar
        game={game}
        canEdit={canEdit}
        status={status}
        viewingCurrent={viewRound >= state.current}
        onNext={goNext}
        onFinish={finish}
        onReopen={() => void persist({ ...game, status: "live" })}
        onBack={() => setViewRound(state.current)}
        standings={standings}
      />

      <ScorePad target={pad} scoring={state.settings.scoring} onClose={() => setPad(null)} onSubmit={applyScore} />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} code={game.code} name={game.name} standingsText={standingsText} />
    </div>
  );
}

function RoundPicker({ count, planned, value, onChange }: { count: number; planned: number | null; value: number; onChange: (i: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm">
        <span className="font-semibold">Round {value + 1}</span>
        <span className="text-muted-foreground">{planned ? ` of ${planned}` : ""}</span>
      </p>
      {count > 1 && (
        <div className="flex max-w-[60%] gap-1 overflow-x-auto" role="tablist" aria-label="Rounds">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === value}
              type="button"
              onClick={() => onChange(i)}
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-lg border font-mono text-sm tabular-nums",
                i === value ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-foreground/40",
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionBar({
  game,
  canEdit,
  status,
  viewingCurrent,
  onNext,
  onFinish,
  onReopen,
  onBack,
  standings,
}: {
  game: StoredGame;
  canEdit: boolean;
  status: ReturnType<typeof advanceStatus>;
  viewingCurrent: boolean;
  onNext: () => void;
  onFinish: () => void;
  onReopen: () => void;
  onBack: () => void;
  standings: Standing[];
}) {
  const [confirmFinish, setConfirmFinish] = useState(false);
  if (!canEdit && game.status === "live") return null;
  const leader = standings[0];

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl gap-2 px-4 py-3">
        {game.status === "done" ? (
          <>
            <Button variant="outline" className="h-12 gap-2" onClick={onReopen}>
              <RotateCcw className="size-4" /> Reopen
            </Button>
            <Button asChild className="h-12 flex-1 gap-2 text-base">
              <Link href="/new">
                New game <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        ) : !viewingCurrent ? (
          <Button variant="outline" className="h-12 flex-1" onClick={onBack}>
            Back to current round
          </Button>
        ) : status === "finished" ? (
          <Button className="h-12 flex-1 gap-2 text-base" onClick={onFinish}>
            <Flag className="size-4" /> Finish game{leader ? `: ${leader.name} wins` : ""}
          </Button>
        ) : (
          <>
            {confirmFinish ? (
              <Button variant="destructive" className="h-12" onClick={onFinish}>
                End now?
              </Button>
            ) : (
              <Button variant="outline" className="h-12 w-12" aria-label="Finish game early" onClick={() => setConfirmFinish(true)}>
                <Flag className="size-4" />
              </Button>
            )}
            <Button className="h-12 flex-1 gap-2 text-base" disabled={status === "incomplete"} onClick={onNext}>
              {status === "incomplete" ? "Enter all scores to continue" : "Next round"}
              {status !== "incomplete" && <ArrowRight className="size-4" />}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function GameSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 px-4 pt-5">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="mt-6 h-11 w-full" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

function GameMissing({ code }: { code: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border">
        <Icon name="court" size={28} />
      </span>
      <h1 className="text-xl font-semibold">Game {code} isn’t on this device</h1>
      <p className="text-muted-foreground">
        Games are saved on the phone that created them for now. Live sharing across devices is coming with cloud sync.
      </p>
      <div className="flex gap-2">
        <Button asChild variant="outline" className="h-11">
          <Link href="/">Home</Link>
        </Button>
        <Button asChild className="h-11">
          <Link href="/new">Create a game</Link>
        </Button>
      </div>
    </div>
  );
}
