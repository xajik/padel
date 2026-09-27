"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AppleMark } from "./apple-mark";
import { useAuth } from "./auth-provider";
import { GoogleMark } from "./google-mark";

type Request = { clientName: string; redirectHost: string };
type Phase = { kind: "loading" } | { kind: "expired"; message: string } | { kind: "ready"; request: Request } | { kind: "sending" };

/**
 * Consent screen of the MCP OAuth flow: sign in with Google or Apple (not as a guest), then allow the
 * assistant to manage the account's games. The MCP Worker checks the ID token and issues the grant.
 */
export function ConnectAssistant({ state }: { state: string }) {
  const { user, ready, signInWithGoogle, signInWithApple, signOut } = useAuth();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);
  const signedIn = user?.isAnonymous === false;

  useEffect(() => {
    let alive = true;
    void fetch(`/oauth/request?state=${encodeURIComponent(state)}`, { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json()) as Request | { error: { message: string } };
        if (!alive) return;
        if ("error" in body) setPhase({ kind: "expired", message: body.error.message });
        else setPhase({ kind: "ready", request: body });
      })
      .catch(() => alive && setPhase({ kind: "expired", message: "Could not reach the server. Try again." }));
    return () => {
      alive = false;
    };
  }, [state]);

  const finish = async (deny: boolean) => {
    setError(null);
    const previous = phase;
    setPhase({ kind: "sending" });
    try {
      const idToken = deny ? undefined : await (await import("@/lib/firebase-auth")).idToken();
      const res = await fetch("/oauth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, idToken, deny }),
      });
      const body = (await res.json()) as { redirectTo?: string; error?: { message: string } };
      if (body.redirectTo) {
        window.location.assign(body.redirectTo);
        return;
      }
      setError(body.error?.message ?? "Something went wrong. Try again.");
    } catch {
      setError("Could not reach the server. Try again.");
    }
    setPhase(previous);
  };

  if (phase.kind === "loading" || !ready) return <p className="text-muted-foreground">Loading…</p>;
  if (phase.kind === "expired") {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Link expired</h1>
        <p className="text-muted-foreground">{phase.message}</p>
      </div>
    );
  }

  const request = phase.kind === "ready" ? phase.request : null;
  const busy = phase.kind === "sending";
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Connect {request?.clientName ?? "your assistant"}</h1>
        <p className="text-muted-foreground">
          {request?.clientName ?? "The assistant"} wants to create games in your Americanoo account, see your games and enter
          scores. It will send you back to <strong>{request?.redirectHost}</strong>.
        </p>
      </div>

      {signedIn ? (
        <div className="space-y-4">
          <p className="text-sm">
            Signed in as <strong>{user.displayName ?? "your account"}</strong>.{" "}
            <button type="button" className="underline underline-offset-4" onClick={() => void signOut()} disabled={busy}>
              Not you?
            </button>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="h-11 flex-1" disabled={busy} onClick={() => void finish(false)}>
              {busy ? "Connecting…" : "Allow"}
            </Button>
            <Button variant="outline" className="h-11 flex-1" disabled={busy} onClick={() => void finish(true)}>
              Deny
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Sign in first. Your games will be kept in this account.</p>
          <Button variant="outline" className="h-11 w-full gap-2" onClick={() => void signInWithGoogle()}>
            <GoogleMark className="size-4" /> Continue with Google
          </Button>
          <Button variant="outline" className="h-11 w-full gap-2" onClick={() => void signInWithApple()}>
            <AppleMark className="size-4" /> Continue with Apple
          </Button>
          <Button variant="ghost" className="h-11 w-full" disabled={busy} onClick={() => void finish(true)}>
            Cancel
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
