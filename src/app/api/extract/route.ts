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
        objekttyp: fieldSchema(Type.STRING),
        stadt: fieldSchema(Type.STRING),
        wohnflaeche: fieldSchema(Type.NUMBER),
        zimmer: fieldSchema(Type.NUMBER),
        baujahr: fieldSchema(Type.NUMBER),
        kaufdatum: fieldSchema(Type.STRING),
        hausgeld: fieldSchema(Type.NUMBER),
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

Beschreibende Objektdetails (nur für den Bericht, ohne Einfluss auf Berechnungen — nur ausfüllen, wenn eindeutig belegt):
- objekttyp: Immobilientyp, z.B. "Eigentumswohnung", "Mehrfamilienhaus", "Einfamilienhaus", "Reihenhaus".
- stadt: Stadt bzw. Stadtteil/Bezirk (z.B. "Berlin-Kreuzberg").
- wohnflaeche: Wohnfläche in m² (reine Zahl).
- zimmer: Anzahl der Zimmer (ggf. mit Nachkommastelle).
- baujahr: vierstellige Baujahr-Zahl.
- kaufdatum: Kaufdatum aus dem Kaufvertrag im Format YYYY-MM-DD.
- hausgeld: monatliches Hausgeld / Wohngeld in Euro (Jahresbetrag durch 12 teilen, falls jährlich angegeben).

Für jedes Feld: value (Zahl bzw. Text), sourceDoc (der Dokumenttyp oder Dateiname, woraus der Wert stammt), confidence (0 bis 1).
Gib ausschließlich JSON gemäß Schema zurück.`;

const WISHLIST_FIELD_ORDER = [
  "name",
  "address",
  "exposeUrl",
  "kaufpreis",
  "wohnflaeche",
  "zimmer",
  "schlafzimmer",
  "badezimmer",
  "etage",
  "etagenGesamt",
  "wohnungstyp",
  "baujahr",
  "objektzustand",
  "ausstattung",
  "istMiete",
  "sollMiete",
  "hausgeld",
  "stellplaetze",
  "provisionsfrei",
  "heizungsart",
  "energietraeger",
  "energieausweistyp",
  "energieKennwert",
  "energieKlasse",
  "maklerName",
  "maklerTelefon",
];

const WISHLIST_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fields: {
      type: Type.OBJECT,
      properties: {
        name: fieldSchema(Type.STRING),
        address: fieldSchema(Type.STRING),
        exposeUrl: fieldSchema(Type.STRING),
        kaufpreis: fieldSchema(Type.NUMBER),
        wohnflaeche: fieldSchema(Type.NUMBER),
        zimmer: fieldSchema(Type.NUMBER),
        schlafzimmer: fieldSchema(Type.NUMBER),
        badezimmer: fieldSchema(Type.NUMBER),
        etage: fieldSchema(Type.NUMBER),
        etagenGesamt: fieldSchema(Type.NUMBER),
        wohnungstyp: fieldSchema(Type.STRING),
        baujahr: fieldSchema(Type.NUMBER),
        objektzustand: fieldSchema(Type.STRING),
        ausstattung: fieldSchema(Type.STRING),
        istMiete: fieldSchema(Type.NUMBER),
        sollMiete: fieldSchema(Type.NUMBER),
        hausgeld: fieldSchema(Type.NUMBER),
        stellplaetze: fieldSchema(Type.NUMBER),
        provisionsfrei: fieldSchema(Type.BOOLEAN),
        heizungsart: fieldSchema(Type.STRING),
        energietraeger: fieldSchema(Type.STRING),
        energieausweistyp: fieldSchema(Type.STRING),
        energieKennwert: fieldSchema(Type.NUMBER),
        energieKlasse: fieldSchema(Type.STRING),
        maklerName: fieldSchema(Type.STRING),
        maklerTelefon: fieldSchema(Type.STRING),
      },
      propertyOrdering: WISHLIST_FIELD_ORDER,
    },
  },
  required: ["fields"],
};

const WISHLIST_PROMPT = `Du bist ein Assistent, der deutsche Immobilien-Exposés auswertet, um eine Objektanalyse vorauszufüllen.
Du erhältst ein oder mehrere Dokumente: typischerweise ein Verkaufs-Exposé (z.B. von ImmoScout24 oder einem Makler), als PDF oder Screenshot.

WICHTIG: Lies das GESAMTE Dokument (alle Seiten) sorgfältig und extrahiere ALLE im Dokument vorhandenen Felder aus dem Schema. Gib für jedes Feld, das du im Dokument findest, einen Wert zurück – auch wenn es nur an einer Stelle steht. Lass ein Feld NUR dann weg, wenn die Information wirklich nicht im Dokument vorkommt. Erfinde keine Werte und schätze nicht.

Zahlenformat: deutsche Schreibweise in reine Zahlen umwandeln. Tausenderpunkte entfernen, Dezimalkomma zu Punkt. Beispiele: "349.900 €" -> 349900, "81,13 m²" -> 81.13, "92,2 kWh/(m²*a)" -> 92.2.

Feld-Hinweise (typische ImmoScout24-Labels in Klammern):
- name: kurze Bezeichnung/Objekttitel der Immobilie (die Überschrift des Exposés).
- address: Adresse bzw. Lage – Stadtteil, PLZ, Ort, Straße soweit angegeben (z.B. "Kreuzberg, 10967 Berlin").
- exposeUrl: die vollständige ImmoScout24-Exposé-URL. Steht meist im Kopf-/Fußbereich, Form "https://www.immobilienscout24.de/expose/<ID>". Übernimm sie OHNE den Zusatz "/print".
- kaufpreis: ("Kaufpreis") Kaufpreis in Euro.
- wohnflaeche: ("Wohnfläche ca.") in m².
- zimmer: ("Zimmer") Anzahl der Zimmer (ggf. mit Nachkommastelle).
- schlafzimmer: ("Schlafzimmer"). badezimmer: ("Badezimmer").
- etage / etagenGesamt: ("Etage"). Bei "1 von 4" ist etage=1 und etagenGesamt=4.
- wohnungstyp: ("Wohnungstyp", z.B. "Etagenwohnung", "Erdgeschosswohnung", "Maisonette").
- baujahr: ("Baujahr") vierstellige Jahreszahl.
- objektzustand: ("Objektzustand", z.B. "Gepflegt", "Neuwertig").
- ausstattung: ("Qualität der Ausstattung", z.B. "Normal", "Gehoben").
- istMiete: aktuelle monatliche Ist-Kaltmiete in Euro. Meist als "Mieteinnahmen pro Monat" angegeben. Falls nur "Jahresnettokaltmiete" genannt ist, teile sie durch 12.
- sollMiete: angestrebte/marktübliche monatliche Soll-Kaltmiete in Euro, nur falls explizit als solche genannt.
- hausgeld: ("Hausgeld") monatlich in Euro.
- stellplaetze: Anzahl Stellplätze/Garagen, falls genannt.
- provisionsfrei: true, wenn "Provision für Käufer: Nein" oder "provisionsfrei" steht; false, wenn eine Käuferprovision angegeben ist.
- heizungsart: ("Heizungsart", z.B. "Etagenheizung", "Zentralheizung", "Fernwärme").
- energietraeger: ("Wesentliche Energieträger", z.B. "Gas", "Öl").
- energieausweistyp: ("Energieausweistyp": "Verbrauchsausweis" oder "Bedarfsausweis").
- energieKennwert: ("Endenergieverbrauch"/"Endenergiebedarf") als Zahl in kWh/(m²·a).
- energieKlasse: ("Energieeffizienzklasse", A+ bis H).
- maklerName: Name des Anbieters/Ansprechpartners bzw. der Maklerfirma (Anbieter-Bereich).
- maklerTelefon: Telefon-/Mobilnummer des Anbieters (z.B. "Mobil: 0163 2189233").

Für jedes Feld: value (Zahl, Text bzw. Wahrheitswert), sourceDoc (Dokumenttyp oder Dateiname), confidence (0 bis 1).
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

  // The only usage restriction: 500 AI extractions per user per month. Pre-check
  // here so an already-exhausted user doesn't spend a Gemini call; the actual
  // increment happens only after a successful extraction (see below).
  const { used, limit } = await getMonthlyUsage(sb, user.id);
  if (used >= limit) {
    return NextResponse.json({ error: "limit", used, limit }, { status: 429 });
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
    // Count this successful extraction against the monthly quota (atomic, capped).
    await consumeMonthlyUsage(sb);
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
