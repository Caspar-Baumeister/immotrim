"use server";

import { verifySession } from "@/lib/dal";
import { userRef } from "@/lib/data/users";
import { adminBucket } from "@/lib/firebase/admin";
import type { PropertyDocument } from "@/lib/types";

// Server side of property documents (users/{uid}/documents/{id}). The file itself
// is uploaded by the browser straight to Storage (see document-service.ts); these
// actions keep the metadata and delete files.

const col = (uid: string) => userRef(uid).collection("documents");

export type DocTarget = { draftId: string } | { propertyId: string };

function toDoc(uid: string, id: string, d: FirebaseFirestore.DocumentData): PropertyDocument {
  return {
    id,
    user_id: uid,
    property_id: d.property_id ?? null,
    draft_id: d.draft_id ?? null,
    doc_type: d.doc_type ?? null,
    file_name: d.file_name,
    file_path: d.file_path,
    mime_type: d.mime_type ?? null,
    size_bytes: d.size_bytes ?? null,
    created_at: d.created_at,
  };
}

export async function listDocuments(target: DocTarget): Promise<PropertyDocument[]> {
  const { uid } = await verifySession();
  const [field, value] = "propertyId" in target
    ? ["property_id", target.propertyId]
    : ["draft_id", target.draftId];
  const q = await col(uid).where(field, "==", value).get();
  return q.docs
    .map((d) => toDoc(uid, d.id, d.data()))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// Records a file the browser just uploaded to users/{uid}/documents/{id}/…
export async function registerDocument(input: {
  id: string;
  target: DocTarget;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  size: number;
}): Promise<PropertyDocument> {
  const { uid } = await verifySession();
  if (!input.filePath.startsWith(`users/${uid}/documents/${input.id}/`)) throw new Error("forbidden");
  const [exists] = await adminBucket().file(input.filePath).exists();
  if (!exists) throw new Error("missing_file");
  const data = {
    property_id: "propertyId" in input.target ? input.target.propertyId : null,
    draft_id: "draftId" in input.target ? input.target.draftId : null,
    doc_type: null,
    file_name: input.fileName,
    file_path: input.filePath,
    mime_type: input.mimeType,
    size_bytes: input.size,
    created_at: new Date().toISOString(),
  };
  await col(uid).doc(input.id).set(data);
  return toDoc(uid, input.id, data);
}

export async function deleteDocument(id: string): Promise<void> {
  const { uid } = await verifySession();
  const ref = col(uid).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return;
  await adminBucket().file(snap.get("file_path")).delete({ ignoreNotFound: true }).catch(() => {});
  await ref.delete();
}

export async function setDocumentType(id: string, docType: string): Promise<void> {
  const { uid } = await verifySession();
  await col(uid).doc(id).update({ doc_type: docType });
}

// After a new property is saved, attach its draft uploads to the real id.
export async function linkDraftDocuments(draftId: string, propertyId: string): Promise<void> {
  const { uid } = await verifySession();
  const q = await col(uid).where("draft_id", "==", draftId).get();
  await Promise.all(q.docs.map((d) => d.ref.update({ property_id: propertyId, draft_id: null })));
}
