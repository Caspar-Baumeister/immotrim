"use client";

// ─────────────────────────────────────────────────────────────────────────────
// LIVE COMPLETION CONTEXT
//
// The sidebar completion bars are computed server-side (see dal.getProfileCompletion)
// and only move once a save triggers router.refresh(). This context seeds those
// server values into client state so a form page can push its *live* completion
// (recomputed as the user types) into the sidebar — the bar rises immediately,
// before any save. On every server re-render (navigation or router.refresh) the
// fresh server values flow back in via `initial`, so document-driven sections
// (immobilien, checklist) and saved edits stay authoritative.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ProfileCompletion } from "./completeness";

type CompletionCtx = {
  completion: ProfileCompletion;
  setSection: (section: keyof ProfileCompletion, value: number) => void;
};

const Ctx = createContext<CompletionCtx | null>(null);

export function CompletionProvider({
  initial,
  children,
}: {
  initial: ProfileCompletion;
  children: React.ReactNode;
}) {
  const [completion, setCompletion] = useState(initial);

  // Re-sync whenever the server recomputes (router.refresh / navigation). `initial`
  // is a fresh object each server render, so this overwrites any live overrides with
  // the now-authoritative saved values.
  useEffect(() => {
    setCompletion(initial);
  }, [initial]);

  const setSection = useCallback(
    (section: keyof ProfileCompletion, value: number) => {
      setCompletion((prev) =>
        prev[section] === value ? prev : { ...prev, [section]: value },
      );
    },
    [],
  );

  return <Ctx.Provider value={{ completion, setSection }}>{children}</Ctx.Provider>;
}

/** The current (possibly live-overridden) completion for the sidebar bars. */
export function useCompletion(): ProfileCompletion {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCompletion must be used within CompletionProvider");
  return ctx.completion;
}

/**
 * Returns a setter that pushes a section's live completion into the sidebar.
 * Call it from a form page as its values change; falls back to a no-op outside a
 * provider so form pages stay usable in isolation (tests, storybook).
 */
export function useSetSectionCompletion(
  section: keyof ProfileCompletion,
): (value: number) => void {
  const ctx = useContext(Ctx);
  return useCallback(
    (value: number) => ctx?.setSection(section, value),
    [ctx, section],
  );
}
