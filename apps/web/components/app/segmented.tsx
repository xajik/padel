"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

/** Single-choice pill group (radio semantics), black-on-white when selected. */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-w-11 rounded-lg border px-3.5 text-sm font-medium tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40",
              size === "lg" ? "h-12" : "h-11",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-foreground hover:border-foreground/40",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
