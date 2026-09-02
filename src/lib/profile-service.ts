"use client";

import { getSupabaseBrowserClient } from "./supabase/client";
import type { Json, Database } from "./supabase/types";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
import type {
  Profile,
  Stammdaten,
  Haushalt,
  Strategie,
  ProfileSection,
} from "@/features/profile/types";

async function requireUserId(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

/** Read the user's profile, or null if they have not created one yet. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return {
    user_id: data.user_id,
    stammdaten: (data.stammdaten as Stammdaten) ?? {},
    haushalt: (data.haushalt as Haushalt) ?? {},
    strategie: (data.strategie as Strategie) ?? {},
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

type SectionData = {
  stammdaten: Stammdaten;
  haushalt: Haushalt;
  strategie: Strategie;
};

/**
 * Upsert one section of the profile. Creates the row on first write (one row per
 * user, keyed on user_id) and only overwrites the given section.
 */
export async function saveProfileSection<S extends ProfileSection>(
  section: S,
  data: SectionData[S],
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const userId = await requireUserId();

  const payload = {
    user_id: userId,
    [section]: data as unknown as Json,
    updated_at: new Date().toISOString(),
  } as unknown as ProfileInsert;

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

/**
 * Ask the AI to turn rough notes in a Strategie text field into a polished
 * German paragraph. Throws on non-OK responses so the caller can distinguish
 * limit/busy from generic failure (same contract as classifyDocuments).
 */
export async function polishStrategieText(
  field: "strategieText" | "ueberMich" | "groesstesRisiko" | "risikoLoesung",
  text: string,
): Promise<string> {
  const res = await fetch("/api/strategie/polish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field, text }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    const err = new Error(body?.error ?? "polish_failed") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const data = (await res.json()) as { text?: string };
  if (!data.text) throw new Error("polish_failed");
  return data.text;
}
