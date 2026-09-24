"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { identify, track } from "@/lib/analytics";
import { isFirebaseConfigured } from "@/lib/config";

export interface AppUser {
  uid: string;
  isAnonymous: boolean;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthState {
  user: AppUser | null;
  ready: boolean;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const UID_KEY = "padel:guest-uid";

function guestUid(): string {
  try {
    let uid = localStorage.getItem(UID_KEY);
    if (!uid) {
      uid = `guest_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
      localStorage.setItem(UID_KEY, uid);
    }
    return uid;
  } catch {
    return "guest_session";
  }
}

/**
 * Identity (FR-3). Until Firebase credentials are provided this is a stub:
 * every visitor is a local guest, and Google sign-in explains it is not enabled yet.
 * With Firebase: signInAnonymously on first use, linkWithPopup/linkWithRedirect for Google.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // TODO(firebase): onAuthStateChanged(auth, ...) + signInAnonymously(auth).
    const uid = guestUid();
    setUser({ uid, isAnonymous: true, displayName: null, photoURL: null });
    identify(uid);
    setReady(true);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured) {
      toast("Google sign-in is almost here", {
        description: "You can keep playing as a guest. Your games are saved on this device.",
      });
      return false;
    }
    // TODO(firebase): linkWithPopup(currentUser, new GoogleAuthProvider()), falling back to
    // signInWithRedirect on mobile; on auth/credential-already-in-use call mergeAnonymousUser.
    track("sign_in", { method: "google" });
    return false;
  }, []);

  const signOut = useCallback(async () => {
    // TODO(firebase): signOut(auth), then a fresh anonymous session.
  }, []);

  const value = useMemo(() => ({ user, ready, signInWithGoogle, signOut }), [user, ready, signInWithGoogle, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
