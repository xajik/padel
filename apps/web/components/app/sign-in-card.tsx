"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-provider";
import { GoogleMark } from "./google-mark";

export function SignInCard() {
  const { user, signInWithGoogle } = useAuth();
  if (user && !user.isAnonymous) return null;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="font-medium">Keep your games everywhere</p>
        <p className="text-sm text-muted-foreground">Sign in to save history, groups and play again on any device.</p>
      </div>
      <Button variant="outline" className="h-11 gap-2" onClick={() => void signInWithGoogle()}>
        <GoogleMark className="size-4" /> Continue with Google
      </Button>
    </div>
  );
}
