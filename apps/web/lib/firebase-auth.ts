"use client";

/**
 * Firebase Auth client (FR-3). Imported lazily by AuthProvider so the SDK stays out of the
 * initial bundle (NFR-3).
 */
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  deleteUser,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithPopup,
  linkWithRedirect,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { firebaseConfig } from "./config";

export type { User };

function auth(): Auth {
  return getAuth(getApps().length ? getApp() : initializeApp(firebaseConfig));
}

function errorCode(err: unknown): string | null {
  return err instanceof FirebaseError ? err.code : null;
}

/** The Google account is already linked to another Firebase user: switch to that user. */
async function signInToExistingAccount(err: unknown): Promise<User | null> {
  if (errorCode(err) !== "auth/credential-already-in-use") return null;
  const credential = GoogleAuthProvider.credentialFromError(err as FirebaseError);
  if (!credential) return null;
  // TODO(firebase): call the mergeAnonymousUser function once Firestore holds games (FR-3.4).
  return (await signInWithCredential(auth(), credential)).user;
}

export function watchUser(onChange: (user: User | null) => void): () => void {
  const a = auth();
  // Finishes a redirect sign-in started when the popup was blocked.
  getRedirectResult(a).catch((err) => signInToExistingAccount(err).catch(() => null));
  return onAuthStateChanged(a, onChange);
}

/** Silent anonymous session (FR-3.1). False when the Anonymous provider is disabled or offline. */
export async function startAnonymousSession(): Promise<boolean> {
  try {
    await signInAnonymously(auth());
    return true;
  } catch {
    return false;
  }
}

export type GoogleSignInResult = "signed-in" | "redirecting" | "cancelled";

/** Google sign-in. An anonymous user is linked so the UID and its data are kept (FR-3.3). */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const a = auth();
  const provider = new GoogleAuthProvider();
  const current = a.currentUser;
  try {
    if (current?.isAnonymous) {
      try {
        await linkWithPopup(current, provider);
      } catch (err) {
        if (!(await signInToExistingAccount(err))) throw err;
      }
    } else {
      await signInWithPopup(a, provider);
    }
    return "signed-in";
  } catch (err) {
    const code = errorCode(err);
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "cancelled";
    if (code === "auth/popup-blocked") {
      await (current?.isAnonymous ? linkWithRedirect(current, provider) : signInWithRedirect(a, provider));
      return "redirecting";
    }
    throw err;
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth());
}

export type DeleteAccountResult = "deleted" | "cancelled";

/**
 * Deletes the signed-in Firebase user. Firebase asks for a recent sign-in first, so the user
 * confirms with Google again when their session is older than a few minutes.
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const user = auth().currentUser;
  if (!user || user.isAnonymous) return "cancelled";
  try {
    await deleteUser(user);
  } catch (err) {
    if (errorCode(err) !== "auth/requires-recent-login") throw err;
    try {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
    } catch (reauthErr) {
      const code = errorCode(reauthErr);
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "cancelled";
      throw reauthErr;
    }
    await deleteUser(user);
  }
  return "deleted";
}
