"use client";

import { ref, uploadBytes } from "firebase/storage";
import { clientStorage, ensureClientUser } from "@/lib/firebase/client";
import { registerDocument, type DocTarget } from "@/lib/document-actions";
import type { PropertyDocument } from "@/lib/types";

export {
  listDocuments,
  deleteDocument,
  setDocumentType,
  linkDraftDocuments,
} from "@/lib/document-actions";

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

// Uploads straight from the browser to Storage (no size limit from the web
// server), then records the document on the server.
export async function uploadDocument(file: File, target: DocTarget): Promise<PropertyDocument> {
  const user = await ensureClientUser();
  const id = crypto.randomUUID();
  const path = `users/${user.uid}/documents/${id}/${safeName(file.name)}`;
  await uploadBytes(ref(clientStorage(), path), file, {
    contentType: file.type || "application/octet-stream",
  });
  return registerDocument({
    id,
    target,
    fileName: file.name,
    filePath: path,
    mimeType: file.type || null,
    size: file.size,
  });
}

// Files are served through the app (session-checked), never from public URLs.
export function downloadUrl(doc: PropertyDocument): string {
  return `/api/documents/${doc.id}`;
}
