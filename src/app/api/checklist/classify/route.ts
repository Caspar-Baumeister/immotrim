import { NextResponse } from "next/server";
import {
  GoogleGenAI,
  Type,
  FileState,
  ApiError,
  createPartFromBase64,
  createPartFromUri,
  createPartFromText,
  createUserContent,
  type GenerateContentResponse,
  type Part,
} from "@google/genai";
import { createServerSupabase } from "@/lib/supabase/server";
import { getMonthlyUsage, consumeMonthlyUsage } from "@/lib/ai-usage";
import {
  CHECKLIST_DOC_TYPES,
  normaliseChecklistDocType,
  type ChecklistDocType,
} from "@/lib/checklist/requirements";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "property-documents";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const INLINE_LIMIT_BYTES = 15 * 1024 * 1024;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

type ReqDoc = { id: string; path: string; name: string };
type ClassifyItem = { index: number; docType: string; fileName?: string };
type ClassifyResult = { id: string; docType: ChecklistDocType; fileName: string };

const ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    index: { type: Type.NUMBER },
    docType: { type: Type.STRING },
    fileName: { type: Type.STRING },
  },
  required: ["index", "docType", "fileName"],
};

const CLASSIFY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    documents: { type: Type.ARRAY, items: ITEM_SCHEMA },
  },
  required: ["documents"],
};

const CLASSIFY_PROMPT = `Du bist ein Assistent, der hochgeladene deutsche Unterlagen eines Kreditantragstellers für eine Baufinanzierung einsortiert ("Unterlagen-Checkliste").

Du erhältst mehrere Dokumente, jeweils gekennzeichnet mit "Dokument <index>: <dateiname>". Es handelt sich um PERSÖNLICHE Unterlagen des Antragstellers (Legitimation, Einkommen, Vermögen, Verbindlichkeiten) — NICHT um Objektunterlagen einer Immobilie.

Aufgabe für JEDES übergebene Dokument:
1) Bestimme den Dokumenttyp (docType) aus genau dieser Liste: ${CHECKLIST_DOC_TYPES.join(", ")}.
   Hinweise:
   - personalausweis: Personalausweis oder Reisepass.
   - gehaltsabrechnung: Lohn-/Gehaltsabrechnung, Verdienstabrechnung.
   - kontoauszug: Kontoauszug eines Giro-/Tages-/Festgeldkontos.
   - steuerbescheid: Einkommensteuerbescheid vom Finanzamt.
   - selbstauskunft: (private) Selbstauskunft / Vermögensübersicht des Antragstellers.
   - schufa: SCHUFA- bzw. Bonitätsauskunft.
   - einkommensteuererklaerung: Einkommensteuererklärung (nicht der Bescheid).
   - arbeitsvertrag: Arbeits-/Anstellungsvertrag.
   - darlehensvertrag: bestehender Ratenkredit-/Darlehensvertrag oder dessen Jahreskontoauszug.
   - depotauszug: Depot-/Wertpapierübersicht.
   - rentenbescheid: Rentenbescheid / Renteninformation.
   - lebensversicherung: Lebensversicherung (z.B. Rückkaufswert).
   - bausparvertrag: Bausparvertrag / Bausparguthaben.
   Nutze "sonstiges" nur, wenn wirklich kein Typ passt.
2) Erzeuge einen kurzen, aussagekräftigen deutschen Anzeigenamen (fileName) für das Dokument. Beispiele:
   "Gehaltsabrechnung März 2026.pdf", "SCHUFA-Bonitätsauskunft.pdf", "Personalausweis.jpg",
   "Einkommensteuerbescheid 2024.pdf", "Kontoauszug Girokonto Februar 2026.pdf".
   Behalte die ursprüngliche Dateiendung (z.B. .pdf, .jpg, .png) bei. Nenne Zeitraum/Jahr, falls im Dokument erkennbar.

Gib für JEDES übergebene Dokument genau ein Element zurück (mit index+docType+fileName). Gib ausschließlich JSON gemäß Schema zurück.`;

export async function POST(request: Request) {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { used, limit } = await getMonthlyUsage(sb, user.id);
  if (used >= limit) {
    return NextResponse.json({ error: "limit", used, limit }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Classification is not configured." }, { status: 503 });
  }

  let docs: ReqDoc[];
  try {
    const body = await request.json();
    docs = Array.isArray(body?.docs) ? body.docs : [];
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (docs.length === 0) {
    return NextResponse.json({ error: "No documents provided" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const parts: Part[] = [];

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    // Guard: only allow paths inside the caller's own folder (RLS also blocks others).
    if (!doc.path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Forbidden path" }, { status: 403 });
    }
    const { data: blob, error } = await sb.storage.from(BUCKET).download(doc.path);
    if (error || !blob) {
      return NextResponse.json({ error: `Could not read ${doc.name}` }, { status: 404 });
    }
    if (blob.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `${doc.name} is too large (max 50MB).` },
        { status: 413 },
      );
    }
    const mimeType = blob.type || "application/pdf";
    parts.push(createPartFromText(`Dokument ${i}: ${doc.name}`));
    if (blob.size <= INLINE_LIMIT_BYTES) {
      const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
      parts.push(createPartFromBase64(base64, mimeType));
    } else {
      const uploaded = await ai.files.upload({ file: blob, config: { mimeType } });
      const ready = await waitForActiveFile(ai, uploaded.name);
      if (!ready?.uri || !ready.mimeType) {
        return NextResponse.json({ error: `Upload of ${doc.name} failed` }, { status: 502 });
      }
      parts.push(createPartFromUri(ready.uri, ready.mimeType));
    }
  }

  let items: ClassifyItem[];
  try {
    const result = await generateWithRetry(ai, parts);
    const text = result.text;
    items = text ? ((JSON.parse(text).documents as ClassifyItem[]) ?? []) : [];
    await consumeMonthlyUsage(sb);
  } catch (e) {
    console.error("Checklist classification failed:", e);
    if (e instanceof ApiError && (e.status === 503 || e.status === 429)) {
      return NextResponse.json({ error: "busy" }, { status: 503 });
    }
    return NextResponse.json({ error: "Classification failed" }, { status: 502 });
  }

  // Apply each classification to its document row (RLS-scoped to this user).
  const results: ClassifyResult[] = [];
  for (const item of items) {
    if (!Number.isInteger(item.index) || item.index < 0 || item.index >= docs.length) continue;
    const doc = docs[item.index];
    const docType = normaliseChecklistDocType(item.docType);
    const fileName = sanitiseFileName(item.fileName, doc.name);
    const { error: updErr } = await sb
      .from("documents")
      .update({ doc_type: docType, file_name: fileName })
      .eq("id", doc.id);
    if (updErr) {
      console.error("Could not update classified document:", updErr);
      continue;
    }
    results.push({ id: doc.id, docType, fileName });
  }

  return NextResponse.json({ results });
}

// Trust the AI's display name but keep it sane: single line, bounded length, and
// always carrying the original file's extension. Falls back to the original name.
function sanitiseFileName(proposed: string | undefined, original: string): string {
  const ext = original.includes(".") ? original.slice(original.lastIndexOf(".")) : "";
  let name = (proposed ?? "").replace(/[\r\n\t]+/g, " ").replace(/[/\\]/g, "-").trim();
  if (!name) return original;
  // Ensure the extension is present exactly once.
  if (ext && name.toLowerCase().endsWith(ext.toLowerCase())) name = name.slice(0, -ext.length);
  return `${name.slice(0, 120).trim()}${ext}`;
}

async function generateWithRetry(
  ai: GoogleGenAI,
  parts: Part[],
): Promise<GenerateContentResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL,
        contents: createUserContent(parts),
        config: {
          systemInstruction: CLASSIFY_PROMPT,
          responseMimeType: "application/json",
          responseSchema: CLASSIFY_SCHEMA,
          temperature: 0,
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
    } catch (e) {
      lastErr = e;
      const retryable = e instanceof ApiError && (e.status === 503 || e.status === 429);
      if (!retryable || attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

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
