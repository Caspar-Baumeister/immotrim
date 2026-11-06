"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInWithCustomToken,
  type Auth,
  type User,
} from "firebase/auth";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseConfig, useEmulators } from "./config";

let wired = false;

function app() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function clientAuth(): Auth {
  const auth = getAuth(app());
  wire(auth);
  return auth;
}

export function clientStorage(): FirebaseStorage {
  const storage = getStorage(app());
  wire(clientAuth(), storage);
  return storage;
}

function wire(auth: Auth, storage?: FirebaseStorage) {
  if (!useEmulators) return;
  if (!wired) {
    connectAuthEmulator(auth, "http://127.0.0.1:9299", { disableWarnings: true });
    wired = true;
  }
  if (storage && !(storage as unknown as { _wired?: boolean })._wired) {
    connectStorageEmulator(storage, "127.0.0.1", 9399);
    (storage as unknown as { _wired?: boolean })._wired = true;
  }
}

// The server session (httpOnly cookie) is the source of truth for who is logged
// in. Uploads go straight from the browser to Storage and need the client SDK to
// be signed in as the same user; if it is not (cleared site data, new tab after
// a long time), trade the session for a custom token.
export async function ensureClientUser(): Promise<User> {
  const auth = clientAuth();
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  const res = await fetch("/api/auth/custom-token", { method: "POST" });
  if (!res.ok) throw new Error("not_authenticated");
  const { token } = (await res.json()) as { token: string };
  const cred = await signInWithCustomToken(auth, token);
  return cred.user;
}

// Hands a fresh Firebase sign-in to the server, which sets the session cookie.
export async function startServerSession(user: User): Promise<void> {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("session_failed");
}

export async function endSession(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
  await clientAuth().signOut().catch(() => {});
}
