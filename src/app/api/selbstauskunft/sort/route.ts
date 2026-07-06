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
import { DEFAULT_INPUTS, type PropertyInputs, type Property, type Json } from "@/lib/supabase";
import {
  SA_DOC_TYPES,
  type SaDocType,
} from "@/lib/selbstauskunft/requirements";
import {
  evaluateCompleteness,
  buildHint,
  type SaMeta,
  type SaMissing,
  type SaStatus,
} from "@/lib/selbstauskunft/completeness";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "property-documents";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const INLINE_LIMIT_BYTES = 15 * 1024 * 1024;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

// One AI-classified property after sorting.
type SortedProperty = {
  id: string;
  name: string;
  address: string | null;
  status: SaStatus;
  reportReady: boolean;
  missing: SaMissing[];
  hint: string | null;
  docCount: number;
  docTypes: SaDocType[];
};

type DocItem = { index: number; docType: string };
type GroupOut = {
  existingPropertyId?: string;
  label?: string;
  address?: string;
  objekttyp?: string;
  stadt?: string;
  documents?: DocItem[];
  kaufpreis?: number;
  eigenanteil?: number;
  zins?: number;
  tilgung?: number;
  zinsbindung?: number;
  kaltmiete?: number;
  nichtUmlagefaehig?: number;
  ruecklagen?: number;
  wohnflaeche?: number;
  baujahr?: number;
  kaufdatum?: string;
  marktwert?: number;
};

const docSchema = {
  type: Type.OBJECT,
  properties: {
    index: { type: Type.NUMBER },
    docType: { type: Type.STRING },
  },
  required: ["index", "docType"],
};

const SORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    properties: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          existingPropertyId: { type: Type.STRING },
          label: { type: Type.STRING },
          address: { type: Type.STRING },
          objekttyp: { type: Type.STRING },
          stadt: { type: Type.STRING },
          documents: { type: Type.ARRAY, items: docSchema },
          kaufpreis: { type: Type.NUMBER },
          eigenanteil: { type: Type.NUMBER },
          zins: { type: Type.NUMBER },
          tilgung: { type: Type.NUMBER },
          zinsbindung: { type: Type.NUMBER },
          kaltmiete: { type: Type.NUMBER },
          nichtUmlagefaehig: { type: Type.NUMBER },
          ruecklagen: { type: Type.NUMBER },
          wohnflaeche: { type: Type.NUMBER },
          baujahr: { type: Type.NUMBER },
          kaufdatum: { type: Type.STRING },
          marktwert: { type: Type.NUMBER },
        },
        required: ["label", "documents"],
      },
    },
  },
  required: ["properties"],
};

const SORT_PROMPT = `Du bist ein Assistent, der hochgeladene deutsche Immobilienunterlagen einem Portfolio zuordnet, um eine Selbstauskunft für die Bank vorzubereiten.

Du erhältst mehrere Dokumente (jeweils mit "Dokument <index>: <dateiname>" gekennzeichnet). Sie gehören zu EINER oder MEHREREN Immobilien.

Möglicherweise gibt es bereits ANGELEGTE Objekte (am Anfang als "Bereits angelegte Objekte" aufgelistet, jeweils mit id, Bezeichnung und Adresse).

Aufgabe:
1) Gruppiere die Dokumente nach Immobilie/Objekt. Ordne jedes Dokument GENAU EINER Immobilie zu — anhand von Adresse, Objektbezeichnung, Flurstück oder Kontext. Wenn sich ein Dokument keiner Immobilie eindeutig zuordnen lässt, ordne es nach bestem Wissen der wahrscheinlichsten Immobilie zu.
1a) WICHTIG: Gehört eine Gruppe zu einem bereits angelegten Objekt (gleiche oder offensichtlich identische Adresse, z.B. "Stockholmer Straße 30" = "Stockholmer Str. 30"), dann setze dessen "existingPropertyId" auf die genannte id. Lege KEIN neues Objekt für eine bereits vorhandene Immobilie an. Nur für wirklich neue Immobilien bleibt existingPropertyId leer.
2) Bestimme für jedes Dokument den Dokumenttyp (docType) aus dieser Liste: ${SA_DOC_TYPES.join(", ")}. Nutze "sonstiges" nur, wenn keiner der anderen Typen passt.
3) Gib für jede Immobilie ein kurzes label (z.B. "Stockholmer Str. 30, Berlin"), die vollständige address, den objekttyp und die stadt zurück, soweit erkennbar.
4) Extrahiere zusätzlich – falls in den Dokumenten erkennbar – die Kennzahlen je Immobilie: kaufpreis (€), eigenanteil (€), zins (% p.a.), tilgung (% p.a.), zinsbindung (Jahre), kaltmiete (€/Monat), nichtUmlagefaehig (€/Monat), ruecklagen (€/Monat), wohnflaeche (m²), baujahr, kaufdatum (YYYY-MM-DD), marktwert (€).

Zahlenformat: deutsche Schreibweise in reine Zahlen umwandeln (Tausenderpunkte entfernen, Dezimalkomma zu Punkt). Beispiel: "349.900,00 €" -> 349900.
Lass Kennzahlen weg, für die es keinen Anhaltspunkt gibt — erfinde nichts. documents (mit index+docType) muss aber für JEDES übergebene Dokument vorhanden sein.

Gib ausschließlich JSON gemäß Schema zurück.`;

export async function POST(request: Request) {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  // Anonymous sessions are allowed here — this is the pre-signup funnel.
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { used, limit } = await getMonthlyUsage(sb, user.id);
  if (used >= limit) {
    return NextResponse.json({ error: "limit", used, limit }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Sorting is not configured." }, { status: 503 });
  }

  let draftId: string;
  try {
    const body = await request.json();
    draftId = String(body?.draftId ?? "");
    if (!draftId) throw new Error("missing draftId");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // The unsorted "inbox": uploads grouped under draftId, not yet on a property.
  const { data: rows } = await sb
    .from("documents")
    .select("*")
    .eq("draft_id", draftId)
    .is("property_id", null)
    .order("created_at", { ascending: true });
  const docs = rows ?? [];
  if (docs.length === 0) {
    return NextResponse.json({ error: "No documents to sort" }, { status: 400 });
  }

  // Existing funnel properties — so newly uploaded documents can be MERGED into
  // the right property instead of spawning a duplicate ("Stockholmer Str. 30").
  const { data: propRows } = await sb
    .from("properties")
    .select("*")
    .order("created_at", { ascending: true });
  const existing = ((propRows ?? []) as unknown as Property[]).filter(
    (p) => p.inputs?.selbstauskunft,
  );
  const existingById = new Map(existing.map((p) => [p.id, p]));

  const ai = new GoogleGenAI({ apiKey });
  const parts: Part[] = [];
  if (existing.length > 0) {
    const list = existing
      .map((p) => `- id=${p.id} | ${p.name}${p.address ? ` | ${p.address}` : ""}`)
      .join("\n");
    parts.push(
      createPartFromText(
        `Bereits angelegte Objekte (ordne passende Dokumente per existingPropertyId zu, lege KEIN Duplikat an):\n${list}`,
      ),
    );
  }
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    if (!doc.file_path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Forbidden path" }, { status: 403 });
    }
    const { data: blob, error } = await sb.storage.from(BUCKET).download(doc.file_path);
    if (error || !blob) {
      return NextResponse.json({ error: `Could not read ${doc.file_name}` }, { status: 404 });
    }
    if (blob.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `${doc.file_name} is too large (max 50MB).` },
        { status: 413 },
      );
    }
    const mimeType = blob.type || "application/pdf";
    parts.push(createPartFromText(`Dokument ${i}: ${doc.file_name}`));
    if (blob.size <= INLINE_LIMIT_BYTES) {
      const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
      parts.push(createPartFromBase64(base64, mimeType));
    } else {
      const uploaded = await ai.files.upload({ file: blob, config: { mimeType } });
      const ready = await waitForActiveFile(ai, uploaded.name);
      if (!ready?.uri || !ready.mimeType) {
        return NextResponse.json({ error: `Upload of ${doc.file_name} failed` }, { status: 502 });
      }
      parts.push(createPartFromUri(ready.uri, ready.mimeType));
    }
  }

  let groups: GroupOut[];
  try {
    const result = await generateWithRetry(ai, parts);
    const text = result.text;
    groups = text ? (JSON.parse(text).properties as GroupOut[]) ?? [] : [];
    await consumeMonthlyUsage(sb);
  } catch (e) {
    console.error("Selbstauskunft sort failed:", e);
    if (e instanceof ApiError && (e.status === 503 || e.status === 429)) {
      return NextResponse.json({ error: "busy" }, { status: 503 });
    }
    return NextResponse.json({ error: "Sorting failed" }, { status: 502 });
  }

  // Address fingerprints of existing properties, for the deterministic merge
  // fallback when the model doesn't set existingPropertyId.
  const existingByKey = new Map<string, Property>();
  for (const p of existing) {
    const key = normAddr(p.address || p.name);
    if (key.length >= 6 && !existingByKey.has(key)) existingByKey.set(key, p);
  }

  // ── Materialise each group: merge into an existing property or create one ────
  const assigned = new Set<number>();
  const out: SortedProperty[] = [];

  for (const [gi, g] of groups.entries()) {
    const items = (g.documents ?? []).filter(
      (d) => Number.isInteger(d.index) && d.index >= 0 && d.index < docs.length && !assigned.has(d.index),
    );
    if (items.length === 0) continue;

    const docTypesById: Record<string, SaDocType> = {};
    const docIds: string[] = [];
    for (const it of items) {
      assigned.add(it.index);
      const doc = docs[it.index];
      docIds.push(doc.id);
      docTypesById[doc.id] = normaliseDocType(it.docType);
    }

    // Resolve the target: explicit existingPropertyId → address match → new.
    const groupKey = normAddr(g.address || g.label || "");
    const target =
      (g.existingPropertyId && existingById.get(g.existingPropertyId)) ||
      (groupKey.length >= 6 ? existingByKey.get(groupKey) : undefined);

    let saved: { id: string; name: string; address: string | null; meta: SaMeta } | null = null;

    if (target) {
      // Merge: add docTypes + fill still-default fields, keep the existing row.
      const prevMeta = target.inputs.selbstauskunft ?? { docTypes: {}, updatedAt: "" };
      const meta: SaMeta = {
        docTypes: { ...prevMeta.docTypes, ...docTypesById },
        manual: prevMeta.manual,
        updatedAt: new Date().toISOString(),
      };
      const inputs = mergeInputs(target.inputs, g, meta);
      const { error: updErr } = await sb
        .from("properties")
        .update({ inputs: inputs as unknown as Json })
        .eq("id", target.id);
      if (updErr) {
        console.error("Could not merge into property during sort:", updErr);
        continue;
      }
      await sb.from("documents").update({ property_id: target.id, draft_id: null }).in("id", docIds);
      saved = { id: target.id, name: target.name, address: target.address, meta };
      // Keep the map fresh so a later group in the same call merges too.
      existingById.set(target.id, { ...target, inputs });
      existingByKey.set(normAddr(target.address || target.name), { ...target, inputs });
    } else {
      // Create a new property.
      const meta: SaMeta = { docTypes: docTypesById, updatedAt: new Date().toISOString() };
      const inputs = buildInputs(g, meta);
      const name = (g.label ?? "").trim() || `Objekt ${gi + 1}`;
      const address = (g.address ?? "").trim() || null;
      const { data: prop, error: insErr } = await sb
        .from("properties")
        .insert({ user_id: user.id, name, address, inputs: inputs as unknown as Json })
        .select("id")
        .single();
      if (insErr || !prop) {
        console.error("Could not create property during sort:", insErr);
        continue;
      }
      await sb.from("documents").update({ property_id: prop.id, draft_id: null }).in("id", docIds);
      saved = { id: prop.id, name, address, meta };
      const created = { ...({} as Property), id: prop.id, user_id: user.id, name, address, inputs } as Property;
      existingById.set(prop.id, created);
      if (address) existingByKey.set(normAddr(address), created);
    }

    const docTypes = [...new Set(Object.values(saved.meta.docTypes))];
    const evaluation = evaluateCompleteness(docTypes);
    out.push({
      id: saved.id,
      name: saved.name,
      address: saved.address,
      status: evaluation.status,
      reportReady: evaluation.reportReady,
      missing: evaluation.missing,
      hint: buildHint(evaluation),
      docCount: Object.keys(saved.meta.docTypes).length,
      docTypes,
    });
  }

  return NextResponse.json({
    properties: out,
    unsorted: docs.length - assigned.size,
  });
}

function normaliseDocType(raw: string): SaDocType {
  const v = (raw ?? "").trim().toLowerCase() as SaDocType;
  return (SA_DOC_TYPES as readonly string[]).includes(v) ? v : "sonstiges";
}

// Merge AI-extracted figures over the sensible defaults so each property carries
// real numbers where available and stays valid where not.
function buildInputs(g: GroupOut, meta: SaMeta): PropertyInputs {
  const num = (v: number | undefined) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;

  const report = {
    ...(g.objekttyp ? { objekttyp: g.objekttyp } : {}),
    ...(g.stadt ? { stadt: g.stadt } : {}),
    ...(num(g.wohnflaeche) ? { wohnflaeche: num(g.wohnflaeche) } : {}),
    ...(num(g.baujahr) ? { baujahr: num(g.baujahr) } : {}),
    ...(g.kaufdatum ? { kaufdatum: g.kaufdatum } : {}),
    ...(num(g.marktwert) ? { marktwert: num(g.marktwert) } : {}),
  };

  return {
    ...DEFAULT_INPUTS,
    kaufpreis: num(g.kaufpreis) ?? DEFAULT_INPUTS.kaufpreis,
    eigenanteil: num(g.eigenanteil) ?? DEFAULT_INPUTS.eigenanteil,
    zins: num(g.zins) ?? DEFAULT_INPUTS.zins,
    tilgung: num(g.tilgung) ?? DEFAULT_INPUTS.tilgung,
    zinsbindung: num(g.zinsbindung) ?? DEFAULT_INPUTS.zinsbindung,
    kaltmiete: num(g.kaltmiete) ?? DEFAULT_INPUTS.kaltmiete,
    nichtUmlagefaehig: num(g.nichtUmlagefaehig) ?? DEFAULT_INPUTS.nichtUmlagefaehig,
    ruecklagen: num(g.ruecklagen) ?? DEFAULT_INPUTS.ruecklagen,
    ...(Object.keys(report).length > 0 ? { report } : {}),
    selbstauskunft: meta,
  };
}

// Fingerprint an address/label for fuzzy equality: "Stockholmer Straße 30" and
// "Stockholmer Str. 30" both collapse to the same key.
function normAddr(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/stra(?:ß|ss)e/g, "str")
    .replace(/[^a-z0-9]/g, "");
}

// Merge newly extracted figures into an existing property: only fill fields still
// at their default (never-set) value, so we never clobber known/edited data.
function mergeInputs(existing: PropertyInputs, g: GroupOut, meta: SaMeta): PropertyInputs {
  const num = (v: number | undefined) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
  const fill = (cur: number, def: number, inc: number | undefined) =>
    cur === def && inc !== undefined ? inc : cur;

  const newReport = {
    ...(g.objekttyp ? { objekttyp: g.objekttyp } : {}),
    ...(g.stadt ? { stadt: g.stadt } : {}),
    ...(num(g.wohnflaeche) ? { wohnflaeche: num(g.wohnflaeche) } : {}),
    ...(num(g.baujahr) ? { baujahr: num(g.baujahr) } : {}),
    ...(g.kaufdatum ? { kaufdatum: g.kaufdatum } : {}),
    ...(num(g.marktwert) ? { marktwert: num(g.marktwert) } : {}),
  };
  // Existing report values win; new ones only fill gaps.
  const mergedReport = { ...newReport, ...(existing.report ?? {}) };

  return {
    ...existing,
    kaufpreis: fill(existing.kaufpreis, DEFAULT_INPUTS.kaufpreis, num(g.kaufpreis)),
    eigenanteil: fill(existing.eigenanteil, DEFAULT_INPUTS.eigenanteil, num(g.eigenanteil)),
    zins: fill(existing.zins, DEFAULT_INPUTS.zins, num(g.zins)),
    tilgung: fill(existing.tilgung, DEFAULT_INPUTS.tilgung, num(g.tilgung)),
    zinsbindung: fill(existing.zinsbindung, DEFAULT_INPUTS.zinsbindung, num(g.zinsbindung)),
    kaltmiete: fill(existing.kaltmiete, DEFAULT_INPUTS.kaltmiete, num(g.kaltmiete)),
    nichtUmlagefaehig: fill(
      existing.nichtUmlagefaehig,
      DEFAULT_INPUTS.nichtUmlagefaehig,
      num(g.nichtUmlagefaehig),
    ),
    ruecklagen: fill(existing.ruecklagen, DEFAULT_INPUTS.ruecklagen, num(g.ruecklagen)),
    ...(Object.keys(mergedReport).length > 0 ? { report: mergedReport } : {}),
    selbstauskunft: meta,
  };
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
          systemInstruction: SORT_PROMPT,
          responseMimeType: "application/json",
          responseSchema: SORT_SCHEMA,
          temperature: 0,
          maxOutputTokens: 8192,
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
