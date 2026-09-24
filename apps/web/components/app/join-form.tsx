"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidCode, normalizeCode } from "@/lib/games/code";

export function JoinForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex w-full max-w-sm flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const code = normalizeCode(value);
        if (!isValidCode(code)) {
          setError("Game codes have 6 letters and numbers, like K7Q2MX.");
          return;
        }
        router.push(`/g/${code}`);
      }}
    >
      <label htmlFor="join-code" className="sr-only">
        Game code
      </label>
      <div className="flex gap-2">
        <Input
          id="join-code"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="Game code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          className="h-11 font-mono tracking-[0.2em] uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case"
          aria-invalid={!!error}
          aria-describedby={error ? "join-error" : undefined}
        />
        <Button type="submit" variant="outline" className="h-11 gap-1.5">
          Join <ArrowRight className="size-4" />
        </Button>
      </div>
      {error && (
        <p id="join-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
