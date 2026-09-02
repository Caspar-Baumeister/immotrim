"use client";

import { v4 as uuidv4 } from "uuid";
import { getSupabaseBrowserClient } from "./supabase/client";
import type { PropertyDocument } from "./supabase/types";

const BUCKET = "property-documents";

async function requireUserId(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// Strip path separators and odd chars so storage keys stay predictable.
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

// A document belongs to exactly one of: a property, a pre-save draft, a
// per-user profile category (Haushalt/Stammdaten/Strategie — no property FK),
// or an Objekt (Objektunterlagen: exposé, Kaufvertrag, Teilungserklärung, …).
type Target =
  | { draftId: string }
  | { propertyId: string }
  | { category: string }
  | { objectId: string };

export async function uploadDocument(
  file: File,
  target: Target,
): Promise<PropertyDocument> {
  const supabase = getSupabaseBrowserClient();
  const userId = await requireUserId();

  const group =
    "draftId" in target
      ? target.draftId
      : "propertyId" in target
        ? target.propertyId
        : "objectId" in target
          ? target.objectId
          : target.category;
  const path = `${userId}/${group}/${uuidv4()}-${safeName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      property_id: "propertyId" in target ? target.propertyId : null,
      draft_id: "draftId" in target ? target.draftId : null,
      category: "category" in target ? target.category : null,
      object_id: "objectId" in target ? target.objectId : null,
      file_name: file.name,
      file_path: path,
      mime_type: file.type || null,
      size_bytes: file.size,
    })
    .select("*")
    .single();

  if (error) {
    // Roll back the orphaned object if the row insert failed.
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return data as unknown as PropertyDocument;
}

export async function listDocuments(target: Target): Promise<PropertyDocument[]> {
  const supabase = getSupabaseBrowserClient();
  const query = supabase.from("documents").select("*").order("created_at", { ascending: false });

  const { data, error } =
    "propertyId" in target
      ? await query.eq("property_id", target.propertyId)
      : "draftId" in target
        ? await query.eq("draft_id", target.draftId)
        : "objectId" in target
          ? await query.eq("object_id", target.objectId)
          : await query.eq("category", target.category).is("property_id", null);

  if (error || !data) return [];
  return data as unknown as PropertyDocument[];
}

// All borrower/personal documents: user-level uploads not tied to a property, a
// pre-save draft or an object (i.e. the Stammdaten/Haushalt/Strategie/Checklist
// categories). This is what the Unterlagen-Checkliste aggregates across sections.
export async function listBorrowerDocuments(): Promise<PropertyDocument[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .is("property_id", null)
    .is("draft_id", null)
    .is("concept_id", null)
    .is("object_id", null)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as PropertyDocument[];
}

// All documents of one object — Unterlagen section, completion scoring and the
// bank ZIP bundle. (Legacy pre-2026-09 "shared concept" documents were assigned
// an object_id by migration 20260902.)
export async function listObjektDocuments(
  objectId: string,
): Promise<PropertyDocument[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("object_id", objectId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as PropertyDocument[];
}

// Manual re-assignment of the classified doc type (fallback / correction to the AI).
export async function setDocumentType(id: string, docType: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("documents")
    .update({ doc_type: docType })
    .eq("id", id);
  if (error) throw error;
}

export type ChecklistClassification = { id: string; docType: string; fileName: string };

// Ask the AI to classify the given docs into checklist types and rename them.
// The route persists doc_type + file_name server-side; we return the applied
// results so the caller can merge them into local state. Throws on non-OK
// responses so the caller can distinguish limit/busy from generic failure.
export async function classifyDocuments(
  docs: { id: string; path: string; name: string }[],
): Promise<ChecklistClassification[]> {
  const res = await fetch("/api/checklist/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docs }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; limit?: number } | null;
    const err = new Error(body?.error ?? "classify_failed") as Error & { status?: number; limit?: number };
    err.status = res.status;
    err.limit = body?.limit;
    throw err;
  }
  const data = (await res.json()) as { results?: ChecklistClassification[] };
  return data.results ?? [];
}

export async function getDownloadUrl(filePath: string): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteDocument(doc: PropertyDocument): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.storage.from(BUCKET).remove([doc.file_path]);
  const { error } = await supabase.from("documents").delete().eq("id", doc.id);
  if (error) throw error;
}

// After a new property is saved, attach all its draft uploads to the real id.
export async function linkDraftDocuments(
  draftId: string,
  propertyId: string,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("documents")
    .update({ property_id: propertyId, draft_id: null })
    .eq("draft_id", draftId)
    .is("property_id", null);
  if (error) throw error;
}

// Wishlist documents can't use property_id (its FK points at `properties`, not
// `wishlist_properties`). draft_id has no FK, so we keep wishlist uploads grouped
// by draft_id and re-point it from the temporary draft to the saved wishlist id.
export async function relinkWishlistDocuments(
  draftId: string,
  wishlistId: string,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("documents")
    .update({ draft_id: wishlistId })
    .eq("draft_id", draftId)
    .is("property_id", null);
  if (error) throw error;
}
