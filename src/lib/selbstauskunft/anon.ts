"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const DRAFT_KEY = "immotrim:sa-inbox-draft";

// Ensures there is a Supabase session for the Selbstauskunft funnel. New visitors
// get an ANONYMOUS session (signInAnonymously) so they can upload + sort without
// registering — the same user_id is later upgraded to a permanent account on
// signup, so all uploaded documents/properties carry over untouched.
//
// Requires "Allow anonymous sign-ins" to be enabled in Supabase Auth settings.
export async function ensureAnonSession(): Promise<{
  userId: string;
  isAnonymous: boolean;
}> {
  const sb = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (user) return { userId: user.id, isAnonymous: Boolean(user.is_anonymous) };

  const { data, error } = await sb.auth.signInAnonymously();
  if (error || !data.user) {
    throw error ?? new Error("Anonymous sign-in failed");
  }
  return { userId: data.user.id, isAnonymous: true };
}

// Stable per-browser "inbox" group id: all pre-sort uploads share it (via
// documents.draft_id) so a reload continues the same session.
export function getInboxDraftId(): string {
  let id = localStorage.getItem(DRAFT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DRAFT_KEY, id);
  }
  return id;
}

export function resetInboxDraftId(): void {
  localStorage.removeItem(DRAFT_KEY);
}
