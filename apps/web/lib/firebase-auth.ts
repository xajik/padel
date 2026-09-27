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
  OAuthProvider,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type Auth,
  type AuthCredential,
  type AuthProvider,
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

export type SignInMethod = "google" | "apple";

function provider(method: SignInMethod): AuthProvider {
  if (method === "google") return new GoogleAuthProvider();
  const apple = new OAuthProvider("apple.com");
  apple.addScope("email");
  apple.addScope("name");
  return apple;
}

function credentialFromError(err: FirebaseError): AuthCredential | null {
  return GoogleAuthProvider.credentialFromError(err) ?? OAuthProvider.credentialFromError(err);
}

/**
 * The Google/Apple account is already linked to another Firebase user: switch to that user and
 * move the anonymous session's cloud games into it (FR-3.4).
 */
async function signInToExistingAccount(err: unknown): Promise<User | null> {
  if (errorCode(err) !== "auth/credential-already-in-use") return null;
  const credential = credentialFromError(err as FirebaseError);
  if (!credential) return null;
  const anonymous = auth().currentUser?.isAnonymous ? auth().currentUser : null;
  const fromIdToken = anonymous ? await anonymous.getIdToken().catch(() => null) : null;
  const user = (await signInWithCredential(auth(), credential)).user;
  if (fromIdToken) {
    await fetch("/api/me/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ fromIdToken }),
    }).catch(() => null);
  }
  return user;
}

/** ID token of the current user (anonymous sessions too), for the game API. Waits for the session to restore. */
export async function idToken(): Promise<string | null> {
  const a = auth();
  await a.authStateReady();
  return a.currentUser ? a.currentUser.getIdToken() : null;
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

export type SignInResult = "signed-in" | "redirecting" | "cancelled";

/** Google or Apple sign-in. An anonymous user is linked so the UID and its data are kept (FR-3.3). */
export async function signIn(method: SignInMethod): Promise<SignInResult> {
  const a = auth();
  const p = provider(method);
  const current = a.currentUser;
  try {
    if (current?.isAnonymous) {
      try {
        await linkWithPopup(current, p);
      } catch (err) {
        if (!(await signInToExistingAccount(err))) throw err;
      }
    } else {
      await signInWithPopup(a, p);
    }
    return "signed-in";
  } catch (err) {
    const code = errorCode(err);
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "cancelled";
    if (code === "auth/popup-blocked") {
      await (current?.isAnonymous ? linkWithRedirect(current, p) : signInWithRedirect(a, p));
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
 * Deletes the signed-in Firebase user and its cloud data: the "My games" index and its rights on
 * shared games (FR-3.7). Firebase asks for a recent sign-in first, so the user confirms with
 * Google or Apple again when their session is older than a few minutes.
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const user = auth().currentUser;
  if (!user || user.isAnonymous) return "cancelled";
  const res = await fetch("/api/me", { method: "DELETE", headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
  if (!res.ok) throw new Error(`Account data deletion failed (${res.status}).`);
  try {
    await deleteUser(user);
  } catch (err) {
    if (errorCode(err) !== "auth/requires-recent-login") throw err;
    try {
      const method: SignInMethod = user.providerData.some((p) => p.providerId === "apple.com") ? "apple" : "google";
      await reauthenticateWithPopup(user, provider(method));
    } catch (reauthErr) {
      const code = errorCode(reauthErr);
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "cancelled";
      throw reauthErr;
    }
    await deleteUser(user);
  }
  return "deleted";
}
