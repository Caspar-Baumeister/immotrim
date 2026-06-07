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
import type { ExtractResponse } from "@/features/property-input/extraction-types";

export const runtime = "nodejs";

const BUCKET = "property-documents";
// Cheapest Flash tier that supports PDF + structured output. Overridable so the
// model can be bumped without a code change. Use the PAID Gemini tier (no training on data).
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
// Files at/under this size go inline as base64; larger ones go via the Files API.
const INLINE_LIMIT_BYTES = 15 * 1024 * 1024;
const MAX_FILE_BYTES = 50 * 1024 * 1024; // Gemini PDF ceiling

type ReqDoc = { path: string; name: string };

// One extracted value: { value, sourceDoc, confidence }.
function fieldSchema(valueType: typeof Type.STRING | typeof Type.NUMBER) {
  return {
    type: Type.OBJECT,
    properties: {
      value: { type: valueType },
      sourceDoc: { type: Type.STRING },
      confidence: { type: Type.NUMBER },
    },
    required: ["value", "sourceDoc", "confidence"],
  };
}

const PROPERTY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fields: {
      type: Type.OBJECT,
      properties: {
        name: fieldSchema(Type.STRING),
        address: fieldSchema(Type.STRING),
        kaufpreis: fieldSchema(Type.NUMBER),
        grunderwerbsteuerPct: fieldSchema(Type.NUMBER),
        notarGrundbuchPct: fieldSchema(Type.NUMBER),
        maklerprovisionPct: fieldSchema(Type.NUMBER),
        sonstigePct: fieldSchema(Type.NUMBER),
        kaltmiete: fieldSchema(Type.NUMBER),
        nichtUmlagefaehig: fieldSchema(Type.NUMBER),
        ruecklagen: fieldSchema(Type.NUMBER),
      },
    },
  },
  required: ["fields"],
};

const PROPERTY_PROMPT = `Du bist ein Assistent, der deutsche Immobilienunterlagen auswertet, um eine Immobilien-Analyse vorauszufüllen.
Du erhältst ein oder mehrere Dokumente: typischerweise Kaufvertrag, Mietvertrag, Wohngeldabrechnung/Hausgeldabrechnung, Grundbuchauszug oder Energieausweis.

Extrahiere NUR Felder, die du tatsächlich im Dokument findest. Erfinde nichts. Lass ein Feld weg, wenn es nicht eindeutig belegt ist.

Feld-Hinweise:
- name: kurze Bezeichnung der Immobilie (z.B. Straße + Ort), falls ableitbar.
- address: vollständige Adresse.
- kaufpreis: Kaufpreis in Euro (reine Zahl, ohne Tausenderpunkte/€) — meist aus dem Kaufvertrag.
- grunderwerbsteuerPct, notarGrundbuchPct, maklerprovisionPct, sonstigePct: Kaufnebenkosten als Prozentsatz des Kaufpreises (Zahl, z.B. 6 für 6%). Nur wenn im Dokument als Prozent oder als Betrag (dann umrechnen) angegeben.
- kaltmiete: monatliche Kaltmiete in Euro — meist aus dem Mietvertrag.
- nichtUmlagefaehig: monatliche nicht umlagefähige Kosten in Euro (Verwaltung, Instandhaltung) — z.B. aus der Hausgeld-/Wohngeldabrechnung.
- ruecklagen: monatliche Instandhaltungsrücklage in Euro — aus der Wohngeld-/Hausgeldabrechnung (Jahresbetrag durch 12 teilen, falls jährlich angegeben).

Für jedes Feld: value (Zahl bzw. Text), sourceDoc (der Dokumenttyp oder Dateiname, woraus der Wert stammt), confidence (0 bis 1).
Gib ausschließlich JSON gemäß Schema zurück.`;

const WISHLIST_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fields: {
      type: Type.OBJECT,
      properties: {
        name: fieldSchema(Type.STRING),
        address: fieldSchema(Type.STRING),
        kaufpreis: fieldSchema(Type.NUMBER),
        wohnflaeche: fieldSchema(Type.NUMBER),
        zimmer: fieldSchema(Type.NUMBER),
        baujahr: fieldSchema(Type.NUMBER),
        kaltmiete: fieldSchema(Type.NUMBER),
      },
    },
  },
  required: ["fields"],
};

const WISHLIST_PROMPT = `Du bist ein Assistent, der deutsche Immobilien-Exposés auswertet, um eine Objektanalyse vorauszufüllen.
Du erhältst ein oder mehrere Dokumente: typischerweise ein Verkaufs-Exposé (z.B. von ImmoScout24 oder einem Makler), eventuell als PDF oder Screenshot.

Extrahiere NUR Felder, die du tatsächlich im Dokument findest. Erfinde nichts. Lass ein Feld weg, wenn es nicht eindeutig belegt ist.

Feld-Hinweise:
- name: kurze Bezeichnung der Immobilie (z.B. Objekttitel oder Straße + Ort), falls ableitbar.
- address: vollständige Adresse bzw. Lage (Straße, PLZ, Ort), soweit angegeben.
- kaufpreis: Kaufpreis in Euro (reine Zahl, ohne Tausenderpunkte/€).
- wohnflaeche: Wohnfläche in Quadratmetern (reine Zahl).
- zimmer: Anzahl der Zimmer (Zahl, ggf. mit Nachkommastelle wie 2.5).
- baujahr: Baujahr als vierstellige Jahreszahl.
- kaltmiete: monatliche Kaltmiete in Euro, falls das Exposé eine (Ist- oder Soll-)Miete nennt.

Für jedes Feld: value (Zahl bzw. Text), sourceDoc (der Dokumenttyp oder Dateiname, woraus der Wert stammt), confidence (0 bis 1).
Gib ausschließlich JSON gemäß Schema zurück.`;

const MODES = {
  property: { schema: PROPERTY_SCHEMA, prompt: PROPERTY_PROMPT },
  wishlist: { schema: WISHLIST_SCHEMA, prompt: WISHLIST_PROMPT },
} as const;

type Mode = keyof typeof MODES;

export async function POST(request: Request) {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Extraction is not configured." }, { status: 503 });
  }

  let docs: ReqDoc[];
  let mode: Mode = "property";
  try {
    const body = await request.json();
    docs = Array.isArray(body?.docs) ? body.docs : [];
    if (body?.mode === "wishlist") mode = "wishlist";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (docs.length === 0) {
    return NextResponse.json({ error: "No documents provided" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const parts: Part[] = [];

  for (const doc of docs) {
    // Guard: only allow paths inside the caller's own folder; RLS would block
    // others anyway, but fail fast and clearly.
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
    parts.push(createPartFromText(`Dokument: ${doc.name}`));

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

  try {
    const result = await generateWithRetry(ai, parts, mode);
    const text = result.text;
    if (!text) {
      return NextResponse.json({ fields: {} } satisfies ExtractResponse);
    }
    const parsed = JSON.parse(text) as ExtractResponse;
    return NextResponse.json({ fields: parsed.fields ?? {} } satisfies ExtractResponse);
  } catch (e) {
    console.error("Gemini extraction failed:", e);
    // Surface transient model overload distinctly so the client can prompt a retry.
    if (e instanceof ApiError && (e.status === 503 || e.status === 429)) {
      return NextResponse.json({ error: "busy" }, { status: 503 });
    }
    return NextResponse.json({ error: "Extraction failed" }, { status: 502 });
  }
}

// Gemini Flash can return 503 (overloaded) / 429 (rate limited) under demand spikes.
// Retry a few times with exponential backoff before giving up.
async function generateWithRetry(
  ai: GoogleGenAI,
  parts: Part[],
  mode: Mode,
): Promise<GenerateContentResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL,
        contents: createUserContent(parts),
        config: {
          systemInstruction: MODES[mode].prompt,
          responseMimeType: "application/json",
          responseSchema: MODES[mode].schema,
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

// Files uploaded via the Files API are PROCESSING briefly before they're usable.
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
