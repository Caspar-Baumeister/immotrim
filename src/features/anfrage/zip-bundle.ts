"use client";

// Builds the document bundle for one Finanzierungsanfrage as a ZIP, client-side:
// every file is already reachable via RLS-scoped signed URLs, so no server route
// (with its memory/time limits) is needed. Folder layout mirrors what a bank
// expects to receive.

import JSZip from "jszip";
import { getDownloadUrl } from "@/lib/document-service";
import type { PropertyDocument } from "@/lib/supabase";

export type ZipInput = {
  borrowerDocs: PropertyDocument[];
  objectDocs: PropertyDocument[];
  /** A freshly generated Selbstauskunft PDF to include at the ZIP root. */
  pdf?: { name: string; blob: Blob };
  zipName: string;
};

// "a.pdf, a.pdf" → "a.pdf, a (2).pdf" so nothing silently overwrites in the ZIP.
function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let i = 2; ; i++) {
    const candidate = `${base} (${i})${ext}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
}

async function addDocs(
  zip: JSZip,
  folder: string,
  docs: PropertyDocument[],
  used: Set<string>,
): Promise<string[]> {
  const failed: string[] = [];
  for (const doc of docs) {
    const url = await getDownloadUrl(doc.file_path);
    if (!url) {
      failed.push(doc.file_name);
      continue;
    }
    const res = await fetch(url);
    if (!res.ok) {
      failed.push(doc.file_name);
      continue;
    }
    const blob = await res.blob();
    zip.file(`${folder}/${uniqueName(doc.file_name, used)}`, blob);
  }
  return failed;
}

/** Builds the ZIP and triggers the browser download. Returns file names that could not be fetched. */
export async function downloadAnfrageZip(input: ZipInput): Promise<string[]> {
  const zip = new JSZip();
  const used = new Set<string>();

  if (input.pdf) zip.file(uniqueName(input.pdf.name, used), input.pdf.blob);
  const usedBorrower = new Set<string>();
  const usedObject = new Set<string>();
  const failed = [
    ...(await addDocs(zip, "Persönliche Unterlagen", input.borrowerDocs, usedBorrower)),
    ...(await addDocs(zip, "Objektunterlagen", input.objectDocs, usedObject)),
  ];

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = input.zipName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return failed;
}
