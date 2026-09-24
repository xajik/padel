"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import {
  autoRounds,
  createGame,
  estimate,
  formatDuration,
  MAX_PLAYERS,
  maxCourts,
  MIN_PLAYERS,
  modeInfo,
  MODES,
  validate,
  type ModeId,
} from "@padel/engine";
import { Icon, MODE_ICONS } from "@/components/icons/icon";
import { Segmented } from "@/components/app/segmented";
import { Stepper } from "@/components/app/stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { track } from "@/lib/analytics";
import { gameRepository, newJoinCode, type StoredGame } from "@/lib/games";
import {
  defaultGameName,
  draftFromQuery,
  draftPlayers,
  draftSettings,
  fitDraft,
  initialDraft,
  playerStep,
  setPlayerCount,
  type Draft,
} from "@/lib/setup/draft";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/app/auth-provider";

const STEPS = ["Format", "Players", "Settings"] as const;
const DRAFT_KEY = "padel:setup-draft:v1";

export function SetupWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraftState] = useState<Draft>(() => initialDraft());
  const [starting, setStarting] = useState(false);

  // Restore: deep-link query wins, then an unfinished draft, then defaults (FR-1.15).
  useEffect(() => {
    if (params.size) {
      const { draft: d, notice } = draftFromQuery(params);
      setDraftState(d);
      setStep(params.get("mode") ? 1 : 0);
      if (notice) toast(notice);
      return;
    }
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) setDraftState(fitDraft({ ...initialDraft(), ...JSON.parse(saved) }));
    } catch {}
  }, [params]);

  const setDraft = (update: (d: Draft) => Draft) =>
    setDraftState((d) => {
      const next = update(d);
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

  const settings = useMemo(() => draftSettings(draft), [draft]);
  const players = useMemo(() => draftPlayers(draft), [draft]);
  const errors = useMemo(() => validate(settings, players), [settings, players]);
  const est = useMemo(() => estimate(settings, players.length), [settings, players.length]);

  async function start() {
    if (errors.length || !user) return;
    setStarting(true);
    try {
      const state = createGame(settings, players);
      const now = Date.now();
      const game: StoredGame = {
        id: crypto.randomUUID(),
        code: newJoinCode(),
        name: draft.name.trim() || defaultGameName(draft.mode),
        ownerUid: user.uid,
        status: "live",
        source: "web",
        createdAt: now,
        updatedAt: now,
        state,
      };
      await gameRepository().create(game);
      track("game_created", { mode: draft.mode, players: players.length, courts: draft.courts, scoring: draft.scoringType });
      sessionStorage.removeItem(DRAFT_KEY);
      router.push(`/g/${game.code}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the game.");
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-6 pb-40">
      <ol className="mb-8 grid grid-cols-3 gap-2" aria-label="Setup progress">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              aria-current={i === step ? "step" : undefined}
              className="w-full text-left"
            >
              <span className={cn("block h-1 rounded-full", i <= step ? "bg-foreground" : "bg-border")} />
              <span className={cn("mt-2 block text-xs", i === step ? "font-medium" : "text-muted-foreground")}>
                {i + 1}. {s}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && <FormatStep draft={draft} onPick={(mode) => { setDraft((d) => fitDraft({ ...d, mode })); setStep(1); }} />}
      {step === 1 && <PlayersStep draft={draft} setDraft={setDraft} />}
      {step === 2 && <SettingsStep draft={draft} setDraft={setDraft} playerCount={players.length} />}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto max-w-2xl space-y-2 px-4 py-3">
          <p className="text-center text-sm text-muted-foreground" aria-live="polite">
            {errors.length && step > 0 ? (
              <span className="text-destructive">{errors[0].message}</span>
            ) : (
              <>
                <span className="font-medium text-foreground">{modeInfo(draft.mode).name}</span> · {players.length} players ·{" "}
                {draft.courts} court{draft.courts > 1 ? "s" : ""} ·{" "}
                {est.openEnded ? "open-ended" : `${est.matches} matches · ~${formatDuration(est.minutes)}`}
              </>
            )}
          </p>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" className="h-12 w-12 shrink-0" aria-label="Back" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="size-5" />
              </Button>
            )}
            {step < 2 ? (
              <Button className="h-12 flex-1 gap-2 text-base" onClick={() => setStep(step + 1)}>
                Next <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button className="h-12 flex-1 gap-2 text-base" disabled={!!errors.length || starting || !user} onClick={start}>
                <Icon name="ball" size={18} /> {starting ? "Starting…" : "Start game"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6 space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {hint && <p className="text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FormatStep({ draft, onPick }: { draft: Draft; onPick: (m: ModeId) => void }) {
  return (
    <section>
      <StepTitle title="Choose a format" hint="Not sure? Americano is the classic: partners rotate every round." />
      <div role="radiogroup" aria-label="Format" className="grid gap-2 sm:grid-cols-2">
        {MODES.map((m) => {
          const selected = m.id === draft.mode;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onPick(m.id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected ? "border-foreground ring-1 ring-foreground" : "hover:border-foreground/40",
              )}
            >
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg border", selected && "border-primary bg-primary text-primary-foreground")}>
                <Icon name={MODE_ICONS[m.id]} size={22} />
              </span>
              <span className="space-y-0.5">
                <span className="flex items-center gap-2 font-medium">
                  {m.name}
                  {selected && <Check className="size-4" />}
                </span>
                <span className="block text-sm leading-snug text-muted-foreground">{m.summary}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PlayersStep({ draft, setDraft }: { draft: Draft; setDraft: (u: (d: Draft) => Draft) => void }) {
  const info = modeInfo(draft.mode);
  const step = playerStep(draft.mode);
  const count = draft.names.length;
  const recent = useRecentNames(draft.names);
  const setName = (i: number, v: string) => setDraft((d) => ({ ...d, names: d.names.map((n, j) => (j === i ? v : n)) }));

  return (
    <section className="space-y-8">
      <StepTitle
        title={info.teams ? "Who's playing? Enter pairs" : "Who's playing?"}
        hint="Names are optional. Leave blank to use Player 1, Player 2…"
      />
      <div className="flex justify-center">
        <Stepper
          label="Players"
          unit={info.teams ? `${count / 2} pairs` : "players"}
          value={count}
          min={Math.max(MIN_PLAYERS, step === 4 ? 4 : MIN_PLAYERS)}
          max={MAX_PLAYERS}
          step={step}
          onChange={(v) => setDraft((d) => setPlayerCount(d, v))}
        />
      </div>

      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Recent players</p>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((name) => (
              <button
                key={name}
                type="button"
                className="h-9 rounded-full border px-3 text-sm hover:border-foreground/40"
                onClick={() =>
                  setDraft((d) => {
                    const i = d.names.findIndex((n) => !n.trim());
                    if (i === -1) return setPlayerCount({ ...d, names: [...d.names, name] }, d.names.length + step);
                    return { ...d, names: d.names.map((n, j) => (j === i ? name : n)) };
                  })
                }
              >
                + {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <ol className={cn("grid gap-2", info.teams ? "sm:grid-cols-2" : "sm:grid-cols-2")}>
        {draft.names.map((n, i) => (
          <li
            key={i}
            className={cn(
              "flex items-center gap-2",
              info.teams && i % 2 === 0 && "rounded-t-xl",
            )}
          >
            <span className="w-7 text-right font-mono text-sm text-muted-foreground tabular-nums">
              {info.teams ? (i % 2 === 0 ? `T${i / 2 + 1}` : "&") : i + 1}
            </span>
            <Input
              value={n}
              maxLength={24}
              onChange={(e) => setName(i, e.target.value)}
              placeholder={`Player ${i + 1}`}
              aria-label={`Player ${i + 1} name`}
              className="h-11"
              enterKeyHint="next"
            />
            {info.sides && (
              <Segmented
                label={`Side for player ${i + 1}`}
                value={draft.sides[i]}
                onChange={(v) => setDraft((d) => ({ ...d, sides: d.sides.map((s, j) => (j === i ? v : s)) }))}
                options={[
                  { value: "A", label: "A" },
                  { value: "B", label: "B" },
                ]}
                className="shrink-0 flex-nowrap"
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function SettingsStep({
  draft,
  setDraft,
  playerCount,
}: {
  draft: Draft;
  setDraft: (u: (d: Draft) => Draft) => void;
  playerCount: number;
}) {
  const info = modeInfo(draft.mode);
  const courtsMax = maxCourts(playerCount);
  const hasByes = !info.fullCourts && playerCount > draft.courts * 4;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => fitDraft({ ...d, [k]: v }));
  const auto = autoRounds(draftSettings(draft), playerCount);

  return (
    <section className="space-y-8">
      <StepTitle title="Settings" hint="Defaults work for most games. Tweak if you like." />

      <Field label="Courts" hint={info.fullCourts ? `${info.name} uses exactly 4 players per court.` : hasByes ? `${playerCount - draft.courts * 4} player${playerCount - draft.courts * 4 > 1 ? "s" : ""} sit out each round, in turn.` : "Everyone plays every round."}>
        <Segmented
          label="Courts"
          value={draft.courts}
          onChange={(v) => set("courts", v)}
          options={Array.from({ length: courtsMax }, (_, i) => ({ value: i + 1, label: i + 1, disabled: info.fullCourts && i + 1 !== draft.courts }))}
        />
      </Field>

      <Field label="Scoring">
        <Segmented
          label="Scoring type"
          value={draft.scoringType}
          onChange={(v) => set("scoringType", v)}
          options={[
            { value: "total", label: "Total points" },
            { value: "first_to", label: "First to" },
            { value: "timed", label: "Timed" },
            { value: "off", label: "Win / loss" },
          ]}
        />
        {(draft.scoringType === "total" || draft.scoringType === "first_to") && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Segmented
              label="Points per match"
              value={[16, 21, 24, 32].includes(draft.points) ? draft.points : -1}
              onChange={(v) => v > 0 && set("points", v)}
              options={[16, 21, 24, 32].map((p) => ({ value: p, label: p }))}
            />
            <Input
              type="number"
              inputMode="numeric"
              min={4}
              max={64}
              aria-label="Custom points"
              value={draft.points}
              onChange={(e) => set("points", Math.min(64, Math.max(4, Number(e.target.value) || 4)))}
              className="h-11 w-20 text-center font-mono"
            />
            <span className="text-sm text-muted-foreground">points</span>
          </div>
        )}
        {draft.scoringType === "timed" && (
          <div className="mt-3 flex items-center gap-2">
            <Segmented
              label="Minutes per round"
              value={draft.minutes}
              onChange={(v) => set("minutes", v)}
              options={[10, 12, 15, 20].map((m) => ({ value: m, label: `${m} min` }))}
            />
          </div>
        )}
      </Field>

      <Field
        label="Pairing"
        hint={
          info.dynamic
            ? `${info.name} pairs players by the leaderboard after each round.`
            : draft.shuffle === "balanced"
              ? "Everyone partners as many different people as possible."
              : draft.shuffle === "random"
                ? "A fresh random draw every round. Sit-outs stay fair."
                : "Balanced draw that you can rearrange before each round."
        }
      >
        {info.dynamic ? (
          <Segmented label="Pairing" value="standings" onChange={() => {}} options={[{ value: "standings", label: "By standings" }]} />
        ) : (
          <Segmented
            label="Pairing"
            value={draft.shuffle}
            onChange={(v) => set("shuffle", v)}
            options={[
              { value: "balanced", label: "Balanced" },
              { value: "random", label: "Random" },
              ...(info.teams ? [] : [{ value: "manual" as const, label: "Manual" }]),
            ]}
          />
        )}
      </Field>

      <Field
        label="Leaderboard"
        hint={
          draft.scoringType === "off"
            ? "Win / loss scoring ranks by wins."
            : draft.leaderboard === "average"
              ? "Points per match played. Fair when match counts differ."
              : draft.leaderboard === "wins"
                ? "Most wins first, then point difference."
                : "Most points scored wins."
        }
      >
        <Segmented
          label="Leaderboard"
          value={draft.scoringType === "off" ? "wins" : draft.leaderboard}
          onChange={(v) => set("leaderboard", v)}
          options={[
            { value: "points", label: "Total points", disabled: draft.scoringType === "off" },
            { value: "wins", label: "Wins first" },
            { value: "average", label: "Average", disabled: draft.scoringType === "off" },
          ]}
        />
      </Field>

      <Field label="Rounds">
        <Segmented
          label="Rounds"
          value={draft.roundsType}
          onChange={(v) => set("roundsType", v)}
          options={[
            { value: "auto", label: `Auto (${auto})` },
            { value: "fixed", label: "Fixed" },
            { value: "open", label: "Open-ended" },
          ]}
        />
        {draft.roundsType === "fixed" && (
          <Stepper className="mt-4" label="Rounds" value={draft.roundsCount} min={1} max={30} onChange={(v) => set("roundsCount", v)} />
        )}
      </Field>

      {hasByes && draft.scoringType !== "off" && (
        <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
          <div>
            <Label htmlFor="bye-comp">Sit-out compensation</Label>
            <p className="text-sm text-muted-foreground">Players sitting out get their average points for that round.</p>
          </div>
          <Switch id="bye-comp" checked={draft.byeCompensation} onCheckedChange={(v) => set("byeCompensation", v)} />
        </div>
      )}

      <Field label="Game name">
        <Input
          value={draft.name}
          onChange={(e) => set("name", e.target.value.slice(0, 60))}
          placeholder={defaultGameName(draft.mode)}
          className="h-11"
        />
      </Field>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {children}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Names from earlier games on this device, not already entered (FR-5.8). */
function useRecentNames(current: string[]): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    void gameRepository()
      .list()
      .then((games) => {
        const seen = new Set<string>();
        for (const g of games.slice(0, 20))
          for (const p of g.state.players) if (!/^Player \d+$/.test(p.name)) seen.add(p.name);
        setNames([...seen]);
      });
  }, []);
  const entered = new Set(current.map((n) => n.trim().toLowerCase()));
  return names.filter((n) => !entered.has(n.toLowerCase())).slice(0, 12);
}
