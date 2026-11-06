"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { clientAuth, startServerSession } from "@/lib/firebase/client";

export type AuthFormState = {
  error?: string;
  success?: boolean;
  fieldErrors?: { email?: string[]; password?: string[] };
} | undefined;

// German messages for the Firebase errors a user can actually cause.
function message(e: unknown): string {
  const code = e instanceof FirebaseError ? e.code : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "E-Mail oder Passwort stimmt nicht.";
    case "auth/email-already-in-use":
      return "Für diese E-Mail gibt es schon ein Konto. Melde dich an oder setze dein Passwort zurück.";
    case "auth/weak-password":
      return "Das Passwort ist zu schwach. Bitte mindestens 8 Zeichen.";
    case "auth/too-many-requests":
      return "Zu viele Versuche. Bitte warte kurz und versuche es dann noch einmal.";
    case "auth/network-request-failed":
      return "Keine Verbindung. Bitte prüfe dein Internet.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Dein Browser hat das Google-Fenster blockiert. Bitte erlaube Pop-ups für immotrim.com.";
    default:
      return "Das hat nicht geklappt. Bitte versuche es noch einmal.";
  }
}

function read(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fieldErrors: NonNullable<AuthFormState>["fieldErrors"] = {};
  if (!/^\S+@\S+\.\S+$/.test(email)) fieldErrors.email = ["Bitte gib eine gültige E-Mail ein."];
  return { email, password, fieldErrors };
}

function go(next: string) {
  // Full navigation so the server renders the app with the new session cookie.
  window.location.assign(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password, fieldErrors } = read(formData);
  if (fieldErrors.email) return { fieldErrors };
  try {
    const cred = await signInWithEmailAndPassword(clientAuth(), email, password);
    await startServerSession(cred.user);
  } catch (e) {
    return { error: message(e) };
  }
  go(String(formData.get("next") ?? "/dashboard"));
  return undefined;
}

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password, fieldErrors } = read(formData);
  if (password.length < 8) fieldErrors.password = ["Mindestens 8 Zeichen."];
  if (fieldErrors.email || fieldErrors.password) return { fieldErrors };
  try {
    const cred = await createUserWithEmailAndPassword(clientAuth(), email, password);
    await startServerSession(cred.user);
  } catch (e) {
    return { error: message(e) };
  }
  go(String(formData.get("next") ?? "/dashboard"));
  return undefined;
}

export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, fieldErrors } = read(formData);
  if (fieldErrors.email) return { fieldErrors };
  try {
    await sendPasswordResetEmail(clientAuth(), email, { url: `${window.location.origin}/login` });
  } catch (e) {
    // Never reveal whether an account exists.
    if (!(e instanceof FirebaseError && e.code === "auth/user-not-found")) {
      const m = message(e);
      if (e instanceof FirebaseError && e.code !== "auth/invalid-email") return { error: m };
    }
  }
  return { success: true };
}

export async function signInWithGoogle(next = "/dashboard"): Promise<string | null> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(clientAuth(), provider);
    await startServerSession(cred.user);
  } catch (e) {
    return message(e);
  }
  go(next);
  return null;
}
