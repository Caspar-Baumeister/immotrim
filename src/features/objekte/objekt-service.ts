"use client";

// CRUD for standalone objects (table concept_objects — name is historical).
// Client-side Supabase writes; data/details/finanzierung are jsonb, coerce
// defensively on read.

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase";
import type { Objekt, ObjektDaten, ObjektDetails, ObjektFinanzierung } from "./types";

type Row = Database["public"]["Tables"]["concept_objects"]["Row"];

async function requireUserId(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

function fromRow(row: Row): Objekt {
  return {
    id: row.id,
    data: ((row.data ?? {}) as ObjektDaten) ?? {},
    details: ((row.details ?? {}) as ObjektDetails) ?? {},
    finanzierung: ((row.finanzierung ?? {}) as ObjektFinanzierung) ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** All objects of the user, newest first (overview grid + pickers). */
export async function listObjekte(): Promise<Objekt[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("concept_objects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as Row[]).map(fromRow);
}

export async function getObjekt(id: string): Promise<Objekt | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("concept_objects")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return fromRow(data as Row);
}

export async function createObjekt(data?: ObjektDaten): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const userId = await requireUserId();

  const { data: row, error } = await supabase
    .from("concept_objects")
    .insert({
      user_id: userId,
      data: (data ?? {}) as unknown as Json,
      details: {} as Json,
      finanzierung: {} as Json,
    })
    .select("id")
    .single();

  if (error) throw error;
  return row.id;
}

export async function updateObjekt(
  id: string,
  patch: { data: ObjektDaten; details: ObjektDetails; finanzierung: ObjektFinanzierung },
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("concept_objects")
    .update({
      data: patch.data as unknown as Json,
      details: patch.details as unknown as Json,
      finanzierung: patch.finanzierung as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

// Deleting an object cascades to its documents rows; the storage files would be
// orphaned otherwise — remove them explicitly first.
export async function deleteObjekt(id: string): Promise<void> {
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
