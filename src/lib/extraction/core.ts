import "server-only";
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
import { adminBucket } from "@/lib/firebase/admin";

// Gemini document-extraction core used by /api/extract. The route owns auth,
// entitlement, quota and the HTTP shape; this module owns storage download,
// Gemini upload/inline handling, prompts, schemas and result sanitising.
// Cheapest Flash tier that supports PDF + structured output. Overridable so the
// model can be bumped without a code change. Use the PAID Gemini tier (no training on data).
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
// Files at/under this size go inline as base64; larger ones go via the Files API.
const INLINE_LIMIT_BYTES = 15 * 1024 * 1024;
const MAX_FILE_BYTES = 50 * 1024 * 1024; // Gemini PDF ceiling

export type ReqDoc = { path: string; name: string };

// One extracted value: { value, sourceDoc, confidence }.
function fieldSchema(
  valueType: typeof Type.STRING | typeof Type.NUMBER | typeof Type.BOOLEAN,
) {
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

// Despite prompt instructions, constrained JSON decoding sometimes makes the model
// emit placeholder entries (value null/"null"/"", confidence 0) for fields it did
// not find. Strip those so the review UI only ever sees real extractions.
const NULLISH_TOKENS = new Set(["null", "none", "n/a", "unbekannt", "-", "—"]);

export type RawField = { value?: unknown; sourceDoc?: string; confidence?: number };

function sanitizeFields(
  fields: Record<string, RawField | undefined>,
): Record<string, RawField> {
  const out: Record<string, RawField> = {};
  for (const [key, field] of Object.entries(fields)) {
    if (!field) continue;
    const v = field.value;
    if (v === null || v === undefined) continue;
    if (typeof v === "number" && !Number.isFinite(v)) continue;
    if (typeof v === "string") {
      const s = v.trim();
      if (!s || NULLISH_TOKENS.has(s.toLowerCase())) continue;
    }
    // confidence 0 = the model admits it has no basis; low-but-positive is kept.
    if (!(typeof field.confidence === "number" && field.confidence > 0)) continue;
    out[key] = field;
  }
  return out;
}

const PROPERTY_FIELD_ORDER = [
  "name",
  "address",
  "objekttyp",
  "stadt",
  "wohnflaeche",
  "zimmer",
  "baujahr",
  "kaufpreis",
  "kaufdatum",
  "grunderwerbsteuerPct",
  "notarGrundbuchPct",
  "maklerprovisionPct",
  "sonstigePct",
  "eigenanteil",
  "zins",
  "tilgung",
  "zinsbindung",
  "loanStartDate",
  "kaltmiete",
  "hausgeld",
  "nichtUmlagefaehig",
  "ruecklagen",
  "marktwert",
];

const PROPERTY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fields: {
      type: Type.OBJECT,
      properties: {
        name: fieldSchema(Type.STRING),
        address: fieldSchema(Type.STRING),
        objekttyp: fieldSchema(Type.STRING),
        stadt: fieldSchema(Type.STRING),
        wohnflaeche: fieldSchema(Type.NUMBER),
        zimmer: fieldSchema(Type.NUMBER),
        baujahr: fieldSchema(Type.NUMBER),
        kaufpreis: fieldSchema(Type.NUMBER),
        kaufdatum: fieldSchema(Type.STRING),
        grunderwerbsteuerPct: fieldSchema(Type.NUMBER),
        notarGrundbuchPct: fieldSchema(Type.NUMBER),
        maklerprovisionPct: fieldSchema(Type.NUMBER),
        sonstigePct: fieldSchema(Type.NUMBER),
        eigenanteil: fieldSchema(Type.NUMBER),
        zins: fieldSchema(Type.NUMBER),
        tilgung: fieldSchema(Type.NUMBER),
        zinsbindung: fieldSchema(Type.NUMBER),
        loanStartDate: fieldSchema(Type.STRING),
        kaltmiete: fieldSchema(Type.NUMBER),
        hausgeld: fieldSchema(Type.NUMBER),
        nichtUmlagefaehig: fieldSchema(Type.NUMBER),
        ruecklagen: fieldSchema(Type.NUMBER),
        marktwert: fieldSchema(Type.NUMBER),
      },
      propertyOrdering: PROPERTY_FIELD_ORDER,
    },
  },
  required: ["fields"],
};

const PROPERTY_PROMPT = `Du bist ein Assistent, der deutsche Immobilienunterlagen auswertet, um eine Immobilien-Analyse für ein bestehendes Portfolio-Objekt vorauszufüllen.
Du erhältst ein oder mehrere Dokumente: typischerweise Kaufvertrag, Mietvertrag, Wohngeld-/Hausgeldabrechnung, Darlehens-/Finanzierungsvertrag oder Finanzierungsangebot, Grundbuchauszug, Energieausweis oder Wertgutachten.

WICHTIG: Lies ALLE Seiten JEDES Dokuments vollständig und sorgfältig. Extrahiere so viele Felder aus dem Schema wie möglich. Es ist deutlich besser, ein Feld mit einem unsicheren Wert (und entsprechend niedriger confidence) auszufüllen, als es leer zu lassen — das Ziel ist, das Formular möglichst vollständig vorzubefüllen; der Nutzer prüft jeden Wert anschließend selbst.
Gib daher auch Werte zurück, bei denen du dir nicht völlig sicher bist (z.B. confidence 0.5–0.8), solange es eine plausible Grundlage im Dokument gibt. Lass ein Feld NUR dann weg, wenn es im Dokument wirklich keinerlei Anhaltspunkt dafür gibt. Frei erfundene Werte ohne jede Grundlage sind aber nicht erlaubt.
Gib für Felder ohne Fundstelle KEIN Objekt zurück — niemals null, leere Strings oder confidence 0.
Wenn Angaben über mehrere Dokumente verteilt sind oder sich aus dem Kontext eindeutig ableiten lassen (z.B. Betrag → Prozentsatz, Jahresbetrag → Monatsbetrag), kombiniere bzw. rechne sie um.

Zahlenformat: deutsche Schreibweise in reine Zahlen umwandeln. Tausenderpunkte entfernen, Dezimalkomma zu Punkt. Beispiele: "349.900,00 €" -> 349900, "81,13 m²" -> 81.13, "3,45 %" -> 3.45.

Feld-Hinweise:
- name: kurze Bezeichnung der Immobilie (z.B. Straße + Ort), falls ableitbar.
- address: vollständige Adresse (Straße, Hausnummer, PLZ, Ort) — meist aus Kaufvertrag, Mietvertrag oder Grundbuch.
- objekttyp: Immobilientyp, z.B. "Eigentumswohnung", "Mehrfamilienhaus", "Einfamilienhaus", "Reihenhaus".
- stadt: Stadt bzw. Stadtteil/Bezirk (z.B. "Berlin-Kreuzberg").
- wohnflaeche: Wohnfläche in m² (reine Zahl) — aus Kaufvertrag, Mietvertrag, Teilungserklärung oder Energieausweis.
- zimmer: Anzahl der Zimmer (ggf. mit Nachkommastelle).
- baujahr: vierstellige Baujahr-Zahl — oft im Energieausweis oder Kaufvertrag.

Kauf:
- kaufpreis: Kaufpreis in Euro — meist aus dem Kaufvertrag ("Kaufpreis", "Gesamtkaufpreis").
- kaufdatum: Datum des Kaufvertrags / der Beurkundung im Format YYYY-MM-DD.
- grunderwerbsteuerPct, notarGrundbuchPct, maklerprovisionPct, sonstigePct: Kaufnebenkosten als Prozentsatz des Kaufpreises (Zahl, z.B. 6 für 6%). Wenn im Dokument nur ein Euro-Betrag steht, rechne ihn ins Verhältnis zum Kaufpreis um. Grunderwerbsteuer ist oft bundeslandabhängig (3,5–6,5%) und im Kaufvertrag genannt.

Finanzierung (aus Darlehensvertrag / Finanzierungsangebot / Annuitätendarlehen):
- eigenanteil: eingesetztes Eigenkapital in Euro (Kaufpreis + Nebenkosten minus Darlehenssumme, falls nicht direkt genannt).
- zins: Sollzins / gebundener Sollzinssatz p.a. in Prozent (Zahl, z.B. 3.45). Nicht den Effektivzins, falls beide genannt sind.
- tilgung: anfänglicher Tilgungssatz p.a. in Prozent (z.B. 2.0).
- zinsbindung: Dauer der Sollzinsbindung in Jahren (z.B. 10).
- loanStartDate: Beginn/Auszahlung des Darlehens im Format YYYY-MM.

Miete:
- kaltmiete: monatliche Kaltmiete / Nettokaltmiete in Euro — meist aus dem Mietvertrag (NICHT die Warmmiete; Betriebskosten-/Heizkostenvorauszahlung nicht mitrechnen).

Laufende Kosten:
- hausgeld: monatliches Hausgeld / Wohngeld in Euro (Jahresbetrag durch 12 teilen, falls jährlich angegeben).
- nichtUmlagefaehig: monatliche nicht umlagefähige Kosten in Euro (Verwaltervergütung, Instandhaltung) — aus der Hausgeld-/Wohngeldabrechnung; bei Jahresbeträgen durch 12 teilen.
- ruecklagen: monatliche Zuführung zur Instandhaltungsrücklage in Euro — aus der Wohngeld-/Hausgeldabrechnung (Jahresbetrag durch 12 teilen, falls jährlich angegeben).

Wert:
- marktwert: geschätzter aktueller Verkehrs-/Marktwert in Euro — aus einem Wertgutachten/Verkehrswertgutachten, falls vorhanden.

Für jedes Feld: value (Zahl bzw. Text), sourceDoc (der Dokumenttyp oder Dateiname, woraus der Wert stammt), confidence (0 bis 1, ehrlich eingeschätzt).
Gib ausschließlich JSON gemäß Schema zurück.`;

const MODES = {
  property: { schema: PROPERTY_SCHEMA, prompt: PROPERTY_PROMPT },
} as const;

export type ExtractMode = keyof typeof MODES;

export function isExtractMode(v: unknown): v is ExtractMode {
  return typeof v === "string" && v in MODES;
}

export type ExtractionFailure = {
  ok: false;
  status: 403 | 404 | 413 | 502 | 503;
  code: "forbidden_path" | "not_found" | "too_large" | "upload_failed" | "busy" | "failed";
  // Human-readable message; /api/extract returns it verbatim as before.
  error: string;
};

export type ExtractionSuccess = {
  ok: true;
  fields: Record<string, RawField>;
  // true when the model returned no text at all (the web route does not count
  // such a call against the quota).
  empty: boolean;
};

export type ExtractionResult = ExtractionSuccess | ExtractionFailure;

// Downloads the caller's documents from Storage, hands them to Gemini with the
// mode's prompt + schema and returns the sanitised fields.
export async function extractFromDocs(
  ai: GoogleGenAI,
  uid: string,
  docs: ReqDoc[],
  mode: ExtractMode,
): Promise<ExtractionResult> {
  const parts: Part[] = [];
  const bucket = adminBucket();

  for (const doc of docs) {
    // Only files inside the caller's own folder.
    if (!doc.path.startsWith(`users/${uid}/`)) {
      return { ok: false, status: 403, code: "forbidden_path", error: "Forbidden path" };
    }

    const file = bucket.file(doc.path);
    const [exists] = await file.exists();
    if (!exists) {
      return { ok: false, status: 404, code: "not_found", error: `Could not read ${doc.name}` };
    }
    const [meta] = await file.getMetadata();
    const size = Number(meta.size ?? 0);
    if (size > MAX_FILE_BYTES) {
      return {
        ok: false,
        status: 413,
        code: "too_large",
        error: `${doc.name} is too large (max 50MB).`,
      };
    }

    const mimeType = meta.contentType || "application/pdf";
    const [buffer] = await file.download();
    parts.push(createPartFromText(`Dokument: ${doc.name}`));

    if (size <= INLINE_LIMIT_BYTES) {
      parts.push(createPartFromBase64(buffer.toString("base64"), mimeType));
    } else {
      const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
      const uploaded = await ai.files.upload({ file: blob, config: { mimeType } });
      const ready = await waitForActiveFile(ai, uploaded.name);
      if (!ready?.uri || !ready.mimeType) {
        return {
          ok: false,
          status: 502,
          code: "upload_failed",
          error: `Upload of ${doc.name} failed`,
        };
      }
      parts.push(createPartFromUri(ready.uri, ready.mimeType));
    }
  }

  try {
    const result = await generateWithRetry(ai, parts, mode);
    const text = result.text;
    if (!text) {
      return { ok: true, fields: {}, empty: true };
    }
    const parsed = JSON.parse(text) as { fields?: Record<string, RawField> };
    return { ok: true, fields: sanitizeFields(parsed.fields ?? {}), empty: false };
  } catch (e) {
    console.error("Gemini extraction failed:", e);
    // Surface transient model overload distinctly so the client can prompt a retry.
    if (e instanceof ApiError && (e.status === 503 || e.status === 429)) {
      return { ok: false, status: 503, code: "busy", error: "busy" };
    }
    return { ok: false, status: 502, code: "failed", error: "Extraction failed" };
  }
}

// Gemini Flash can return 503 (overloaded) / 429 (rate limited) under demand spikes.
// Retry a few times with exponential backoff before giving up.
async function generateWithRetry(
  ai: GoogleGenAI,
  parts: Part[],
  mode: ExtractMode,
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
          // Document extraction is a lookup task, not a reasoning one. Deterministic
          // output + disabled thinking avoids gemini-2.5-flash returning a sparse
          // object (it otherwise skips obvious fields under constrained JSON decoding).
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
