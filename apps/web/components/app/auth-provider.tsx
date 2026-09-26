"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { identify, track } from "@/lib/analytics";
import { isFirebaseConfigured } from "@/lib/config";
import { gameRepository } from "@/lib/games";

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
  /** Deletes the Google account's sign-in and, optionally, its games on this device. */
  deleteAccount: (options: { removeDeviceGames: boolean }) => Promise<boolean>;
}

const AuthContext = createContext<AuthState | null>(null);
const UID_KEY = "padel:guest-uid";
const LAST_USER_KEY = "padel:last-user";

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

function guestUser(): AppUser {
  return { uid: guestUid(), isAnonymous: true, displayName: null, photoURL: null };
}

/** When a guest becomes a signed-in user with a new UID, their device games move with them. */
async function handOverGuestGames(next: AppUser) {
  try {
    const last = JSON.parse(localStorage.getItem(LAST_USER_KEY) ?? "null") as Pick<AppUser, "uid" | "isAnonymous"> | null;
    // Before Firebase, the local guest UID was the only identity.
    const previous = last ?? { uid: guestUid(), isAnonymous: true };
    if (previous.isAnonymous && previous.uid !== next.uid) {
      await gameRepository().transferOwnership(previous.uid, next.uid);
    }
    localStorage.setItem(LAST_USER_KEY, JSON.stringify({ uid: next.uid, isAnonymous: next.isAnonymous }));
  } catch {
    // Storage unavailable: nothing on this device to hand over.
  }
}

const loadFirebaseAuth = () => import("@/lib/firebase-auth");

/**
 * Identity (FR-3). With Firebase configured, visitors get a silent anonymous session (if the
 * Anonymous provider is enabled; otherwise a local guest UID) and can sign in with Google.
 * Without Firebase, every visitor is a local guest.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const apply = async (next: AppUser) => {
      await handOverGuestGames(next);
      if (cancelled) return;
      setUser(next);
      identify(next.uid);
      setReady(true);
    };

    if (!isFirebaseConfigured) {
      void apply(guestUser());
      return () => {
        cancelled = true;
      };
    }

    let unsubscribe = () => {};
    void loadFirebaseAuth().then(({ watchUser, startAnonymousSession }) => {
      if (cancelled) return;
      unsubscribe = watchUser(async (fbUser) => {
        if (fbUser) {
          await apply({
            uid: fbUser.uid,
            isAnonymous: fbUser.isAnonymous,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
          });
        } else if (!(await startAnonymousSession())) {
          await apply(guestUser());
        }
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured) {
      toast("Google sign-in is not available", {
        description: "You can keep playing as a guest. Your games are saved on this device.",
      });
      return false;
    }
    try {
      const result = await (await loadFirebaseAuth()).signInWithGoogle();
      if (result !== "signed-in") return false;
      track("sign_in", { method: "google" });
      return true;
    } catch {
      toast.error("Couldn't sign in with Google", { description: "Please try again." });
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    await (await loadFirebaseAuth()).signOut();
  }, []);

  const deleteAccount = useCallback(
    async ({ removeDeviceGames }: { removeDeviceGames: boolean }) => {
      if (!isFirebaseConfigured || !user || user.isAnonymous) return false;
      const rememberUser = (isAnonymous: boolean) => {
        try {
          localStorage.setItem(LAST_USER_KEY, JSON.stringify({ uid: user.uid, isAnonymous }));
        } catch {
          // Storage unavailable: nothing on this device to hand over.
        }
      };
      // Set before deleting: the auth listener starts a new guest session right away. Kept games
      // are handed to it like a guest's games on sign-in; games to remove stay with this UID.
      rememberUser(!removeDeviceGames);
      try {
        const result = await (await loadFirebaseAuth()).deleteAccount();
        if (result !== "deleted") {
          rememberUser(false);
          return false;
        }
      } catch {
        rememberUser(false);
        toast.error("Couldn't delete your account", { description: "Please try again, or email us and we'll do it for you." });
        return false;
      }
      if (removeDeviceGames) {
        const repo = gameRepository();
        const games = await repo.list();
        await Promise.all(games.filter((g) => g.ownerUid === user.uid).map((g) => repo.remove(g.code)));
      }
      identify(null);
      return true;
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, ready, signInWithGoogle, signOut, deleteAccount }),
    [user, ready, signInWithGoogle, signOut, deleteAccount],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
