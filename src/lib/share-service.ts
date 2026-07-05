"use client";

import { getSupabaseBrowserClient } from "./supabase/client";

// Returns the caller's always-on portfolio share token, creating the row on first
// use. One row per user (unique user_id); the token defaults server-side. RLS lets
// a user read/insert only their own row — see 20260705_portfolio_shares.sql.
export async function getOrCreateShareToken(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const existing = await supabase
    .from("portfolio_shares")
    .select("token")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.token;

  const inserted = await supabase
    .from("portfolio_shares")
    .insert({ user_id: user.id })
    .select("token")
    .single();
  if (inserted.error) throw inserted.error;
  return inserted.data.token;
}
