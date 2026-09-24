"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Large −/+ number control (FR-1.3). */
export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  className?: string;
}) {
  const btn =
    "grid size-12 place-items-center rounded-full border bg-background transition-colors hover:border-foreground/40 disabled:opacity-30 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
  return (
    <div className={cn("flex items-center gap-5", className)} role="group" aria-label={label}>
      <button type="button" className={btn} aria-label={`Fewer ${label.toLowerCase()}`} disabled={value - step < min} onClick={() => onChange(value - step)}>
        <Minus className="size-5" />
      </button>
      <div className="min-w-16 text-center" aria-live="polite">
        <span className="font-mono text-5xl font-semibold tabular-nums">{value}</span>
        {unit && <span className="block text-xs text-muted-foreground">{unit}</span>}
      </div>
      <button type="button" className={btn} aria-label={`More ${label.toLowerCase()}`} disabled={value + step > max} onClick={() => onChange(value + step)}>
        <Plus className="size-5" />
      </button>
    </div>
  );
}
