"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase";
import {
  normaliseKonzeptType,
  type Konzept,
  type KonzeptDraft,
  type KonzeptFinanzierung,
  type KonzeptObjekt,
} from "./types";

type Row = Database["public"]["Tables"]["financing_concepts"]["Row"];

async function requireUserId(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// objekt/finanzierung are jsonb — coerce defensively so older rows still hydrate.
function fromRow(row: Row): Konzept {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    conceptType: normaliseKonzeptType(row.concept_type),
    description: row.description ?? undefined,
    wishlistPropertyId: row.wishlist_property_id,
    objekt: ((row.objekt ?? {}) as KonzeptObjekt) ?? {},
    finanzierung: ((row.finanzierung ?? {}) as KonzeptFinanzierung) ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toColumns(draft: KonzeptDraft) {
  return {
    title: draft.title,
    concept_type: draft.conceptType ?? null,
    description: draft.description ?? null,
    wishlist_property_id: draft.wishlistPropertyId ?? null,
    objekt: draft.objekt as unknown as Json,
    finanzierung: draft.finanzierung as unknown as Json,
  };
}

export async function createKonzept(draft: KonzeptDraft): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("financing_concepts")
    .insert({ user_id: userId, ...toColumns(draft) })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateKonzept(id: string, draft: KonzeptDraft): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase
    .from("financing_concepts")
    .update({ ...toColumns(draft), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function getKonzept(id: string): Promise<Konzept | null> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("financing_concepts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return fromRow(data as Row);
}

export async function getAllKonzepte(): Promise<Konzept[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("financing_concepts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as Row[]).map(fromRow);
}

// Deleting a concept cascades to its documents rows AND the storage objects are
// orphaned otherwise — remove them explicitly first.
export async function deleteKonzept(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { data: docs } = await supabase
    .from("documents")
    .select("file_path")
    .eq("concept_id", id);
  const paths = (docs ?? []).map((d) => d.file_path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from("property-documents").remove(paths);
  }

  const { error } = await supabase.from("financing_concepts").delete().eq("id", id);
  if (error) throw error;
}
