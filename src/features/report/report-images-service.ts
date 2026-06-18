"use client";

import { v4 as uuidv4 } from "uuid";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Report images reuse the private "property-documents" bucket (its RLS already scopes
// objects by the leading "{user_id}/" path segment). Metadata lives in report_images.
const BUCKET = "property-documents";

export type ReportImage = {
  id: string;
  user_id: string;
  property_id: string | null;
  scope: "title" | "property";
  file_path: string;
  created_at: string;
};

export type ReportImageTarget = { scope: "title" } | { propertyId: string };

async function requireUserId(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

export async function uploadReportImage(
  file: File,
  target: ReportImageTarget
): Promise<ReportImage> {
  const supabase = getSupabaseBrowserClient();
  const userId = await requireUserId();

  const path = `${userId}/report/${uuidv4()}-${safeName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("report_images")
    .insert({
      user_id: userId,
      property_id: "propertyId" in target ? target.propertyId : null,
      scope: "scope" in target ? target.scope : "property",
      file_path: path,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return data as unknown as ReportImage;
}

export async function listReportImages(): Promise<ReportImage[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("report_images")
    .select("*")
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as unknown as ReportImage[];
}

export async function deleteReportImage(image: ReportImage): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.storage.from(BUCKET).remove([image.file_path]);
  const { error } = await supabase.from("report_images").delete().eq("id", image.id);
  if (error) throw error;
}

export async function getReportImageUrl(filePath: string): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 300);
  if (error || !data) return null;
  return data.signedUrl;
}
