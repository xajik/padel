"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-provider";
import { AppleMark } from "./apple-mark";
import { GoogleMark } from "./google-mark";

export function SignInCard() {
  const { user, signInWithGoogle, signInWithApple } = useAuth();
  if (user && !user.isAnonymous) return null;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="font-medium">Keep your games everywhere</p>
        <p className="text-sm text-muted-foreground">
          Sign in to see your games in the apps, on any browser and in your AI assistant.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Button variant="outline" className="h-11 gap-2" onClick={() => void signInWithGoogle()}>
          <GoogleMark className="size-4" /> Continue with Google
        </Button>
        <Button variant="outline" className="h-11 gap-2" onClick={() => void signInWithApple()}>
          <AppleMark className="size-4" /> Continue with Apple
        </Button>
      </div>
    </div>
  );
}
