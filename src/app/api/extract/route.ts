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

// Like fieldSchema, but constrains value decoding to the form's select options.
function enumFieldSchema(values: string[]) {
  return {
    type: Type.OBJECT,
    properties: {
      value: { type: Type.STRING, enum: values },
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

type RawField = { value?: unknown; sourceDoc?: string; confidence?: number };

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
Gib für Felder ohne Fundstelle KEIN Objekt zurück — niemals null, leere Strings oder confidence 0.

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

// ── Konzept-Objekt (candidate object inside a financing concept) ─────────────
const KONZEPT_OBJEKT_FIELD_ORDER = [
  "adresse",
  "ort",
  "objekttyp",
  "wohnflaeche",
  "zimmer",
  "baujahr",
  "kaufpreis",
  "erwarteteMiete",
  "hausgeld",
  "etage",
  "etagenGesamt",
  "schlafzimmer",
  "badezimmer",
  "stellplaetze",
  "objektzustand",
  "ausstattung",
  "provisionsfrei",
  "heizungsart",
  "energietraeger",
  "energieausweistyp",
  "energieKennwert",
  "energieKlasse",
  "maklerName",
  "maklerTelefon",
  "exposeUrl",
];

const KONZEPT_OBJEKT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fields: {
      type: Type.OBJECT,
      properties: {
        adresse: fieldSchema(Type.STRING),
        ort: fieldSchema(Type.STRING),
        objekttyp: fieldSchema(Type.STRING),
        wohnflaeche: fieldSchema(Type.NUMBER),
        zimmer: fieldSchema(Type.NUMBER),
        baujahr: fieldSchema(Type.NUMBER),
        kaufpreis: fieldSchema(Type.NUMBER),
        erwarteteMiete: fieldSchema(Type.NUMBER),
        hausgeld: fieldSchema(Type.NUMBER),
        etage: fieldSchema(Type.NUMBER),
        etagenGesamt: fieldSchema(Type.NUMBER),
        schlafzimmer: fieldSchema(Type.NUMBER),
        badezimmer: fieldSchema(Type.NUMBER),
        stellplaetze: fieldSchema(Type.NUMBER),
        objektzustand: fieldSchema(Type.STRING),
        ausstattung: fieldSchema(Type.STRING),
        provisionsfrei: fieldSchema(Type.BOOLEAN),
        heizungsart: fieldSchema(Type.STRING),
        energietraeger: fieldSchema(Type.STRING),
        energieausweistyp: fieldSchema(Type.STRING),
        energieKennwert: fieldSchema(Type.NUMBER),
        energieKlasse: fieldSchema(Type.STRING),
        maklerName: fieldSchema(Type.STRING),
        maklerTelefon: fieldSchema(Type.STRING),
        exposeUrl: fieldSchema(Type.STRING),
      },
      propertyOrdering: KONZEPT_OBJEKT_FIELD_ORDER,
    },
  },
  required: ["fields"],
};

const KONZEPT_OBJEKT_PROMPT = `Du bist ein Assistent, der deutsche Immobilien-Exposés auswertet, um das Objekt eines Finanzierungskonzepts vorauszufüllen — mit den Eckdaten, die eine Bank für eine Finanzierungsanfrage braucht.
Du erhältst ein oder mehrere Dokumente: typischerweise ein Verkaufs-Exposé (z.B. von ImmoScout24 oder einem Makler), als PDF oder Screenshot.

WICHTIG: Lies das GESAMTE Dokument (alle Seiten) sorgfältig und extrahiere ALLE im Dokument vorhandenen Felder aus dem Schema. Gib für jedes Feld, das du im Dokument findest, einen Wert zurück – auch wenn es nur an einer Stelle steht. Lass ein Feld NUR dann weg, wenn die Information wirklich nicht im Dokument vorkommt. Erfinde keine Werte und schätze nicht.
Gib für Felder ohne Fundstelle KEIN Objekt zurück — niemals null, leere Strings oder confidence 0.

Zahlenformat: deutsche Schreibweise in reine Zahlen umwandeln. Tausenderpunkte entfernen, Dezimalkomma zu Punkt. Beispiele: "349.900 €" -> 349900, "81,13 m²" -> 81.13, "92,2 kWh/(m²*a)" -> 92.2.

Feld-Hinweise (typische ImmoScout24-Labels in Klammern):
- adresse: NUR Straße und Hausnummer (z.B. "Musterstraße 12"), soweit angegeben. PLZ/Ort gehören NICHT hierher.
- ort: PLZ und Ort, ggf. mit Stadtteil (z.B. "10967 Berlin" oder "Kreuzberg, 10967 Berlin"). Straße gehört NICHT hierher.
- objekttyp: Immobilientyp bzw. ("Wohnungstyp"), z.B. "Eigentumswohnung", "Etagenwohnung", "Erdgeschosswohnung", "Maisonette", "Einfamilienhaus".
- wohnflaeche: ("Wohnfläche ca.") in m².
- zimmer: ("Zimmer") Anzahl der Zimmer (ggf. mit Nachkommastelle).
- baujahr: ("Baujahr") vierstellige Jahreszahl.
- kaufpreis: ("Kaufpreis") Kaufpreis in Euro.
- erwarteteMiete: erwartete monatliche Kaltmiete in Euro. Nimm die angestrebte/marktübliche Soll-Kaltmiete, falls genannt; sonst die aktuelle Ist-Kaltmiete ("Mieteinnahmen pro Monat"). Falls nur eine "Jahresnettokaltmiete" genannt ist, teile sie durch 12.
- hausgeld: ("Hausgeld") monatlich in Euro.
- etage / etagenGesamt: ("Etage"). Bei "1 von 4" ist etage=1 und etagenGesamt=4.
- schlafzimmer: ("Schlafzimmer"). badezimmer: ("Badezimmer").
- stellplaetze: Anzahl Stellplätze/Garagen, falls genannt.
- objektzustand: ("Objektzustand", z.B. "Gepflegt", "Neuwertig").
- ausstattung: ("Qualität der Ausstattung", z.B. "Normal", "Gehoben").
- provisionsfrei: true, wenn "Provision für Käufer: Nein" oder "provisionsfrei" steht; false, wenn eine Käuferprovision angegeben ist.
- heizungsart: ("Heizungsart", z.B. "Etagenheizung", "Zentralheizung", "Fernwärme").
- energietraeger: ("Wesentliche Energieträger", z.B. "Gas", "Öl").
- energieausweistyp: ("Energieausweistyp": "Verbrauchsausweis" oder "Bedarfsausweis").
- energieKennwert: ("Endenergieverbrauch"/"Endenergiebedarf") als Zahl in kWh/(m²·a).
- energieKlasse: ("Energieeffizienzklasse", A+ bis H).
- maklerName: Name des Anbieters/Ansprechpartners bzw. der Maklerfirma (Anbieter-Bereich).
- maklerTelefon: Telefon-/Mobilnummer des Anbieters (z.B. "Mobil: 0163 2189233").
- exposeUrl: die vollständige ImmoScout24-Exposé-URL. Steht meist im Kopf-/Fußbereich, Form "https://www.immobilienscout24.de/expose/<ID>". Übernimm sie OHNE den Zusatz "/print".

Für jedes Feld: value (Zahl, Text bzw. Wahrheitswert), sourceDoc (Dokumenttyp oder Dateiname), confidence (0 bis 1).
Gib ausschließlich JSON gemäß Schema zurück.`;

// ── Stammdaten (personal master data) ────────────────────────────────────────
const STAMMDATEN_FIELD_ORDER = [
  "anrede",
  "vorname",
  "nachname",
  "geburtsdatum",
  "geburtsort",
  "familienstand",
  "telefon",
  "email",
  "strasse",
  "plzOrt",
  "wohnhaftSeit",
  "anzahlKinder",
  "staatsangehoerigkeit",
  "steuerId",
  "beschaeftigung",
  "arbeitgeber",
  "beruf",
  "beschaeftigtSeit",
  "kontoinhaber",
  "kreditinstitut",
  "iban",
  "bic",
];

const STAMMDATEN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fields: {
      type: Type.OBJECT,
      properties: {
        anrede: enumFieldSchema(["herr", "frau"]),
        vorname: fieldSchema(Type.STRING),
        nachname: fieldSchema(Type.STRING),
        geburtsdatum: fieldSchema(Type.STRING),
        geburtsort: fieldSchema(Type.STRING),
        familienstand: enumFieldSchema(["ledig", "verheiratet", "geschieden", "verwitwet"]),
        telefon: fieldSchema(Type.STRING),
        email: fieldSchema(Type.STRING),
        strasse: fieldSchema(Type.STRING),
        plzOrt: fieldSchema(Type.STRING),
        wohnhaftSeit: fieldSchema(Type.STRING),
        anzahlKinder: fieldSchema(Type.NUMBER),
        staatsangehoerigkeit: fieldSchema(Type.STRING),
        steuerId: fieldSchema(Type.STRING),
        beschaeftigung: enumFieldSchema([
          "angestellter",
          "beamter",
          "selbstaendiger",
          "rentner",
        ]),
        arbeitgeber: fieldSchema(Type.STRING),
        beruf: fieldSchema(Type.STRING),
        beschaeftigtSeit: fieldSchema(Type.STRING),
        kontoinhaber: fieldSchema(Type.STRING),
        kreditinstitut: fieldSchema(Type.STRING),
        iban: fieldSchema(Type.STRING),
        bic: fieldSchema(Type.STRING),
      },
      propertyOrdering: STAMMDATEN_FIELD_ORDER,
    },
  },
  required: ["fields"],
};

const STAMMDATEN_PROMPT = `Du bist ein Assistent, der deutsche Personendokumente auswertet, um die persönlichen Stammdaten eines Kreditantragstellers vorauszufüllen.
Du erhältst typischerweise: Personalausweis/Reisepass, Meldebescheinigung, Lohn-/Gehaltsabrechnung, Arbeitsvertrag, Steuerbescheid, Kontoauszug, Bankkarte oder ein SEPA-Mandat.

WICHTIG: Lies ALLE Dokumente vollständig. Extrahiere so viele Felder wie möglich. Lass ein Feld NUR weg, wenn es im Dokument keinerlei Anhaltspunkt gibt. Erfinde keine Werte.
Gib für Felder ohne Fundstelle KEIN Objekt zurück — niemals null, leere Strings oder confidence 0.

Feld-Hinweise:
- anrede: "herr" oder "frau" (exakt diese Werte) — aus Anrede/Titel im Dokument ableitbar.
- vorname / nachname: vollständiger Vor- und Nachname (Personalausweis, Lohnabrechnung, Arbeitsvertrag).
- geburtsdatum: im Format YYYY-MM-DD.
- geburtsort: Geburtsort laut Ausweis.
- familienstand: exakt einer dieser Werte: "ledig", "verheiratet", "geschieden", "verwitwet" (aus Steuerbescheid/Lohnabrechnung, z.B. Steuerklasse, oder Meldebescheinigung).
- telefon: Telefon-/Mobilnummer, falls angegeben.
- email: E-Mail-Adresse, falls angegeben.
- strasse: Straße und Hausnummer der Wohnanschrift.
- plzOrt: Postleitzahl und Ort der Wohnanschrift (z.B. "14467 Potsdam").
- wohnhaftSeit: Einzugsdatum an der aktuellen Adresse im Format YYYY-MM (aus Meldebescheinigung "wohnhaft seit"/"Einzugsdatum").
- anzahlKinder: Anzahl unterhaltspflichtiger Kinder (aus Lohnabrechnung Kinderfreibeträge oder Kindergeld-Unterlagen).
- staatsangehoerigkeit: Staatsangehörigkeit (z.B. "deutsch").
- steuerId: 11-stellige steuerliche Identifikationsnummer (aus Lohnabrechnung/Steuerbescheid).
- beschaeftigung: exakt einer dieser Werte: "angestellter", "beamter", "selbstaendiger", "rentner" (aus Arbeitsvertrag, Lohnabrechnung, BWA/Steuerbescheid oder Rentenbescheid ableitbar).
- arbeitgeber: Name des Arbeitgebers (Lohnabrechnung/Arbeitsvertrag).
- beruf: ausgeübter Beruf / Tätigkeit.
- beschaeftigtSeit: Eintrittsdatum beim Arbeitgeber im Format YYYY-MM.

Kontoverbindung (aus Kontoauszug, Bankkarte, SEPA-Mandat oder Überweisungsträger):
- kontoinhaber: Name des Kontoinhabers.
- kreditinstitut: Name der Bank (z.B. "Sparkasse Berlin", "ING").
- iban: IBAN ohne Leerzeichen (deutsches Format: DE + 20 Zeichen).
- bic: BIC/SWIFT-Code (8 oder 11 Zeichen).

Für jedes Feld: value (Text bzw. Zahl), sourceDoc (Dokumenttyp oder Dateiname), confidence (0 bis 1).
Gib ausschließlich JSON gemäß Schema zurück.`;

// ── Haushaltsrechnung (household budget) ──────────────────────────────────────
const HAUSHALT_FIELD_ORDER = [
  "nettoeinkommen",
  "anzahlGehaelter",
  "kindergeld",
  "weitereEinkuenfte",
  "mietausgaben",
  "lebenshaltung",
  "krankenversicherung",
  "versicherungen",
  "ratenkredite",
  "sonstigeAusgaben",
  "bankSparguthaben",
  "wertpapiere",
  "sonstigesVermoegen",
  "sonstigeVerbindlichkeiten",
];

const HAUSHALT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fields: {
      type: Type.OBJECT,
      properties: {
        nettoeinkommen: fieldSchema(Type.NUMBER),
        anzahlGehaelter: fieldSchema(Type.NUMBER),
        kindergeld: fieldSchema(Type.NUMBER),
        weitereEinkuenfte: fieldSchema(Type.NUMBER),
        mietausgaben: fieldSchema(Type.NUMBER),
        lebenshaltung: fieldSchema(Type.NUMBER),
        krankenversicherung: fieldSchema(Type.NUMBER),
        versicherungen: fieldSchema(Type.NUMBER),
        ratenkredite: fieldSchema(Type.NUMBER),
        sonstigeAusgaben: fieldSchema(Type.NUMBER),
        bankSparguthaben: fieldSchema(Type.NUMBER),
        wertpapiere: fieldSchema(Type.NUMBER),
        sonstigesVermoegen: fieldSchema(Type.NUMBER),
        sonstigeVerbindlichkeiten: fieldSchema(Type.NUMBER),
      },
      propertyOrdering: HAUSHALT_FIELD_ORDER,
    },
  },
  required: ["fields"],
};

const HAUSHALT_PROMPT = `Du bist ein Assistent, der deutsche Finanzunterlagen auswertet, um die Haushaltsrechnung eines Kreditantragstellers vorauszufüllen.
Du erhältst typischerweise: Lohn-/Gehaltsabrechnung, Kontoauszüge, Depot-/Vermögensübersicht oder Kreditverträge.

WICHTIG: Lies ALLE Dokumente vollständig. Extrahiere so viele Felder wie möglich. Lass ein Feld NUR weg, wenn es keinerlei Anhaltspunkt gibt. Erfinde keine Werte.
Gib für Felder ohne Fundstelle KEIN Objekt zurück — niemals null, leere Strings oder confidence 0.

Zahlenformat: deutsche Schreibweise in reine Zahlen umwandeln. Tausenderpunkte entfernen, Dezimalkomma zu Punkt. "3.450,00 €" -> 3450.

Feld-Hinweise (alle Beträge in Euro):
- nettoeinkommen: monatliches Nettoeinkommen / Auszahlungsbetrag laut Gehaltsabrechnung.
- anzahlGehaelter: Anzahl der Gehälter pro Jahr (12, 13 oder 14), falls erkennbar.
- kindergeld: monatliches Kindergeld (aus Kontoauszug oder Kindergeldbescheid).
- weitereEinkuenfte: regelmäßige monatliche Zusatzeinnahmen (Unterhalt, Nebentätigkeit, Renten) — OHNE Mieteinnahmen aus Immobilien.
- mietausgaben: eigene monatliche Warmmiete / Wohnkosten (aus Kontoauszug als wiederkehrende Mietzahlung).
- lebenshaltung: monatliche private Lebenshaltungskosten (Essen, Mobilität, Freizeit), falls beziffert.
- krankenversicherung: monatlicher selbst gezahlter Krankenversicherungsbeitrag (nur bei privater oder freiwillig gesetzlicher Versicherung — bei gesetzlich Versicherten ist er bereits vom Netto abgezogen, dann weglassen).
- versicherungen: monatliche Summe weiterer Versicherungsbeiträge (Haftpflicht, Hausrat, BU, Leben, Kfz) — ohne Krankenversicherung.
- ratenkredite: monatliche Rate laufender Ratenkredite (aus Kreditvertrag/Kontoauszug) — ohne Immobiliendarlehen.
- sonstigeAusgaben: sonstige regelmäßige monatliche Ausgaben (Unterhaltszahlungen, Sparpläne, Abos).
- bankSparguthaben: Summe der Bank-/Sparguthaben (Kontostände, Tagesgeld, Festgeld).
- wertpapiere: Wert von Wertpapieren / Aktien / Fonds (Depotübersicht).
- sonstigesVermoegen: weitere Vermögenswerte (Bausparverträge, Rückkaufswert von Lebensversicherungen, Edelmetalle) — ohne Immobilien.
- sonstigeVerbindlichkeiten: Gesamthöhe sonstiger Verbindlichkeiten / Restschuld von Konsumkrediten (ohne Immobiliendarlehen, nicht die Monatsrate).

Für jedes Feld: value (Zahl), sourceDoc (Dokumenttyp oder Dateiname), confidence (0 bis 1).
Gib ausschließlich JSON gemäß Schema zurück.`;

const MODES = {
  property: { schema: PROPERTY_SCHEMA, prompt: PROPERTY_PROMPT },
  wishlist: { schema: WISHLIST_SCHEMA, prompt: WISHLIST_PROMPT },
  konzeptObjekt: { schema: KONZEPT_OBJEKT_SCHEMA, prompt: KONZEPT_OBJEKT_PROMPT },
  stammdaten: { schema: STAMMDATEN_SCHEMA, prompt: STAMMDATEN_PROMPT },
  haushalt: { schema: HAUSHALT_SCHEMA, prompt: HAUSHALT_PROMPT },
} as const;

type Mode = keyof typeof MODES;

function isMode(v: unknown): v is Mode {
  return typeof v === "string" && v in MODES;
}

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
    if (isMode(body?.mode)) mode = body.mode;
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
    const parsed = JSON.parse(text) as { fields?: Record<string, RawField> };
    // Count this successful extraction against the monthly quota (atomic, capped).
    await consumeMonthlyUsage(sb);
    return NextResponse.json({
      fields: sanitizeFields(parsed.fields ?? {}),
    } as ExtractResponse);
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
