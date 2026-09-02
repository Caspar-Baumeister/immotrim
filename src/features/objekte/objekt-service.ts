"use client";

// CRUD for concept objects (concept_objects) — the candidate objects inside a
// financing concept. Client-side Supabase writes, same pattern as
// konzept-service.ts; data/details are jsonb, coerce defensively on read.

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase";
import type { ConceptObject, KonzeptObjekt, KonzeptObjektDetails } from "./types";

type Row = Database["public"]["Tables"]["concept_objects"]["Row"];

async function requireUserId(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

function fromRow(row: Row): ConceptObject {
  return {
    id: row.id,
    conceptId: row.concept_id,
    data: ((row.data ?? {}) as KonzeptObjekt) ?? {},
    details: ((row.details ?? {}) as KonzeptObjektDetails) ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listConceptObjects(conceptId: string): Promise<ConceptObject[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("concept_objects")
    .select("*")
    .eq("concept_id", conceptId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as Row[]).map(fromRow);
}

/** All objects of the user, for the concept list cards (grouped client-side). */
export async function listAllConceptObjects(): Promise<ConceptObject[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("concept_objects")
    .select("*")
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as Row[]).map(fromRow);
}

export async function getConceptObject(id: string): Promise<ConceptObject | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("concept_objects")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return fromRow(data as Row);
}

export async function createConceptObject(
  conceptId: string,
  data?: KonzeptObjekt,
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const userId = await requireUserId();

  const { data: row, error } = await supabase
    .from("concept_objects")
    .insert({
      user_id: userId,
      concept_id: conceptId,
      data: (data ?? {}) as unknown as Json,
      details: {} as Json,
    })
    .select("id")
    .single();

  if (error) throw error;
  return row.id;
}

export async function updateConceptObject(
  id: string,
  patch: { data: KonzeptObjekt; details: KonzeptObjektDetails },
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("concept_objects")
    .update({
      data: patch.data as unknown as Json,
      details: patch.details as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

// Deleting an object cascades to its documents rows; the storage files would be
// orphaned otherwise — remove them explicitly first.
export async function deleteConceptObject(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { data: docs } = await supabase
    .from("documents")
    .select("file_path")
    .eq("object_id", id);
  const paths = (docs ?? []).map((d) => d.file_path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from("property-documents").remove(paths);
  }

  const { error } = await supabase.from("concept_objects").delete().eq("id", id);
  if (error) throw error;
}
