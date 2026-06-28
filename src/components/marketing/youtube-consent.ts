"use client";

import { useSyncExternalStore } from "react";

// Single source of truth for the YouTube auto-load consent. Stored first-party in
// localStorage and read via useSyncExternalStore so SSR/hydration stay consistent
// and changes propagate across tabs and components without effect-driven setState.
export const YT_CONSENT_KEY = "immotrim_youtube_consent";
const CHANGE_EVENT = "immotrim:youtube-consent";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(YT_CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

// Server (and first client render before hydration) has no consent.
function getServerSnapshot(): boolean {
  return false;
}

export function useYouTubeConsent(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setYouTubeConsent(granted: boolean): void {
  try {
    if (granted) {
      localStorage.setItem(YT_CONSENT_KEY, "granted");
    } else {
      localStorage.removeItem(YT_CONSENT_KEY);
    }
  } catch {
    // Storage unavailable (private mode / blocked) — nothing to persist.
  }
  // Notify same-tab subscribers ('storage' only fires in other tabs).
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
