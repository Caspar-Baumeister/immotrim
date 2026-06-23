import "server-only";
import {
  GoogleGenAI,
  FileState,
  createPartFromBase64,
  createPartFromUri,
  createPartFromText,
  createUserContent,
  type Part,
} from "@google/genai";
import type { createServerSupabase } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>;

const BUCKET = "property-documents";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
// Same thresholds as /api/extract: inline as base64 up to 15 MB, Files API above.
const INLINE_LIMIT_BYTES = 15 * 1024 * 1024;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
// Cap how many docs we read in one tool call to bound latency/cost.
const MAX_DOCS = 6;

// Files uploaded via the Files API are PROCESSING briefly before usable.
async function waitForActiveFile(ai: GoogleGenAI, name: string | undefined) {
  if (!name) return null;
  for (let i = 0; i < 10; i++) {
    const f = await ai.files.get({ name });
    if (f.state === FileState.ACTIVE) return f;
    if (f.state === FileState.FAILED) return null;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

// Reads a property's uploaded documents and answers `question` from them. Runs a
// focused, separate Gemini call and returns plain text the main chat model folds
// into its reply. RLS scopes the document query to the caller; we additionally
// fail-fast on any path outside the user's own folder.
export async function answerFromPropertyDocuments(
  ai: GoogleGenAI,
  sb: ServerSupabase,
  userId: string,
  propertyId: string,
  question: string,
): Promise<string> {
  const { data: docs } = await sb
    .from("documents")
    .select("file_name, file_path, size_bytes")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (!docs || docs.length === 0) {
    return "This property has no uploaded documents.";
  }

  const parts: Part[] = [
    createPartFromText(
      `Beantworte die folgende Frage ausschließlich anhand der beigefügten Dokumente. Wenn die Antwort nicht in den Dokumenten steht, sage das klar. Frage: ${question}`,
    ),
  ];

  for (const doc of docs.slice(0, MAX_DOCS)) {
    if (!doc.file_path.startsWith(`${userId}/`)) continue;
    if ((doc.size_bytes ?? 0) > MAX_FILE_BYTES) continue;

    const { data: blob, error } = await sb.storage.from(BUCKET).download(doc.file_path);
    if (error || !blob) continue;

    const mimeType = blob.type || "application/pdf";
    parts.push(createPartFromText(`Dokument: ${doc.file_name}`));
    if (blob.size <= INLINE_LIMIT_BYTES) {
      const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
      parts.push(createPartFromBase64(base64, mimeType));
    } else {
      const uploaded = await ai.files.upload({ file: blob, config: { mimeType } });
      const ready = await waitForActiveFile(ai, uploaded.name);
      if (ready?.uri && ready.mimeType) {
        parts.push(createPartFromUri(ready.uri, ready.mimeType));
      }
    }
  }

  const result = await ai.models.generateContent({
    model: MODEL,
    contents: createUserContent(parts),
    config: { temperature: 0, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
  });
  return result.text?.trim() || "Could not extract an answer from the documents.";
}
