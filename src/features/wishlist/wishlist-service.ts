"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase";
import {
  DEFAULT_WISHLIST_EXTRAS,
  totalNebenkostenPct,
  type WishlistDetails,
  type WishlistDraft,
  type WishlistExtras,
  type WishlistProperty,
} from "./types";

type Row = Database["public"]["Tables"]["wishlist_properties"]["Row"];

async function requireUserId(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// `extras`/`details` are stored as jsonb. Coerce defensively so older rows
// (empty `{}`) still hydrate a complete object.
function parseExtras(raw: Json): WishlistExtras {
  const e = (raw ?? {}) as Partial<WishlistExtras>;
  return {
    ...DEFAULT_WISHLIST_EXTRAS,
    ...e,
    nebenkosten: { ...DEFAULT_WISHLIST_EXTRAS.nebenkosten, ...(e.nebenkosten ?? {}) },
  };
}

function parseDetails(raw: Json): WishlistDetails {
  return (raw ?? {}) as WishlistDetails;
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
    istMiete: row.ist_miete,
    sollMiete: row.soll_miete,
    eigenanteil: row.eigenanteil,
    extras: parseExtras(row.extras),
    details: parseDetails(row.details),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Shared column mapping for insert/update. nebenkosten_pct is derived from the
// breakdown to satisfy the NOT NULL column and keep simple displays working.
function toColumns(draft: WishlistDraft) {
  return {
    name: draft.name,
    address: draft.address,
    expose_url: draft.exposeUrl,
    lage: draft.lage,
    kaufpreis: draft.kaufpreis,
    wohnflaeche: draft.wohnflaeche,
    zimmer: draft.zimmer,
    baujahr: draft.baujahr,
    ist_miete: draft.istMiete,
    soll_miete: draft.sollMiete,
    kaltmiete: draft.sollMiete ?? draft.istMiete, // keep legacy column populated
    eigenanteil: draft.eigenanteil,
    nebenkosten_pct: totalNebenkostenPct(draft.extras.nebenkosten),
    extras: draft.extras as unknown as Json,
    details: draft.details as unknown as Json,
    notes: draft.notes,
  };
}

export async function createWishlistProperty(draft: WishlistDraft): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("wishlist_properties")
    .insert({ user_id: userId, ...toColumns(draft) })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateWishlistProperty(id: string, draft: WishlistDraft): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase
    .from("wishlist_properties")
    .update({ ...toColumns(draft), updated_at: new Date().toISOString() })
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
