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

type Target = { draftId: string } | { propertyId: string };

export async function uploadDocument(
  file: File,
  target: Target,
): Promise<PropertyDocument> {
  const supabase = getSupabaseBrowserClient();
  const userId = await requireUserId();

  const group = "draftId" in target ? target.draftId : target.propertyId;
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
      : await query.eq("draft_id", target.draftId);

  if (error || !data) return [];
  return data as unknown as PropertyDocument[];
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
