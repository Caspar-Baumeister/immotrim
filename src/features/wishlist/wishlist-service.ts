"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase";
import type { WishlistDraft, WishlistProperty } from "./types";

type Row = Database["public"]["Tables"]["wishlist_properties"]["Row"];

async function requireUserId(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

function fromRow(row: Row): WishlistProperty {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    address: row.address,
    exposeUrl: row.expose_url,
    lage: row.lage,
    kaufpreis: row.kaufpreis,
    wohnflaeche: row.wohnflaeche,
    zimmer: row.zimmer,
    baujahr: row.baujahr,
    kaltmiete: row.kaltmiete,
    eigenanteil: row.eigenanteil,
    nebenkostenPct: row.nebenkosten_pct,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsert(userId: string, draft: WishlistDraft) {
  return {
    user_id: userId,
    name: draft.name,
    address: draft.address,
    expose_url: draft.exposeUrl,
    lage: draft.lage,
    kaufpreis: draft.kaufpreis,
    wohnflaeche: draft.wohnflaeche,
    zimmer: draft.zimmer,
    baujahr: draft.baujahr,
    kaltmiete: draft.kaltmiete,
    eigenanteil: draft.eigenanteil,
    nebenkosten_pct: draft.nebenkostenPct,
    notes: draft.notes,
  };
}

function toUpdate(draft: WishlistDraft) {
  return {
    name: draft.name,
    address: draft.address,
    expose_url: draft.exposeUrl,
    lage: draft.lage,
    kaufpreis: draft.kaufpreis,
    wohnflaeche: draft.wohnflaeche,
    zimmer: draft.zimmer,
    baujahr: draft.baujahr,
    kaltmiete: draft.kaltmiete,
    eigenanteil: draft.eigenanteil,
    nebenkosten_pct: draft.nebenkostenPct,
    notes: draft.notes,
    updated_at: new Date().toISOString(),
  };
}

export async function createWishlistProperty(draft: WishlistDraft): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("wishlist_properties")
    .insert(toInsert(userId, draft))
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateWishlistProperty(id: string, draft: WishlistDraft): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase
    .from("wishlist_properties")
    .update(toUpdate(draft))
    .eq("id", id);

  if (error) throw error;
}

export async function getWishlistProperty(id: string): Promise<WishlistProperty | null> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("wishlist_properties")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return fromRow(data as Row);
}

export async function getAllWishlistProperties(): Promise<WishlistProperty[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("wishlist_properties")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as Row[]).map(fromRow);
}

export async function deleteWishlistProperty(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase
    .from("wishlist_properties")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
