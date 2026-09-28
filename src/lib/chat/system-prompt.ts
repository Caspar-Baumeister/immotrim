import type { PortfolioKpis, PortfolioProperty } from "@/features/portfolio/calculations";
import type { PropertyReportMetrics } from "@/features/report/report-metrics";
import type { ChatField } from "./property-fields";

// System prompt for the iPhone app's portfolio chat (/api/mobile/chat). The
// model gets the raw portfolio, the computed KPIs and the list of open fields,
// plus the behavioural rules. German or English by locale.

export type ChatPromptInput = {
  locale: string;
  today: string; // YYYY-MM-DD
  properties: PortfolioProperty[];
  kpis: PortfolioKpis;
  perProperty: PropertyReportMetrics[];
  openFields: Record<string, ChatField[]>; // propertyId → open fields
};

export function isGermanLocale(locale: string): boolean {
  return locale.trim().toLowerCase().startsWith("de");
}

// Round every number to two decimals and drop undefined/null so the JSON in
// the prompt stays compact.
function compact(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  if (Array.isArray(value)) return value.map(compact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined || v === null) continue;
      out[k] = compact(v);
    }
    return out;
  }
  return value;
}

function portfolioJson(properties: PortfolioProperty[]): string {
  const rows = properties.map((p) => {
    // Selbstauskunft metadata is document bookkeeping, irrelevant for the chat.
    const inputs = { ...p.inputs };
    delete inputs.selbstauskunft;
    return { id: p.id, name: p.name, address: p.address ?? undefined, inputs };
  });
  return JSON.stringify(compact(rows));
}

function metricsJson(perProperty: PropertyReportMetrics[]): string {
  const rows = perProperty.map((m) => ({
    id: m.id,
    name: m.name,
    kaufpreis: m.kaufpreis,
    nebenkostenEur: m.nebenkostenEur,
    totalAcquisition: m.totalAcquisition,
    currentValue: m.currentValue,
    currentDebt: m.currentDebt,
    ltvPct: m.ltv,
    loanAmount: m.loanAmount,
    monthlyPayment: m.monthlyPayment,
    remainingFixedYears: m.remainingFixedYears,
    monthlyColdRent: m.monthlyColdRent,
    annualColdRent: m.annualColdRent,
    rentPerSqm: m.rentPerSqm,
    grossYieldPct: m.grossYield,
    netYieldPct: m.netYield,
    monthlyCashFlowBeforeTax: m.monthlyCashFlowBeforeTax,
    monthlyCashFlowAfterTax: m.monthlyCashFlowAfterTax,
    valueSharePct: m.valueShare,
    debtSharePct: m.debtShare,
    rentSharePct: m.rentShare,
  }));
  return JSON.stringify(compact(rows));
}

function openFieldsText(
  properties: PortfolioProperty[],
  openFields: Record<string, ChatField[]>,
  none: string,
): string {
  return properties
    .map((p) => {
      const fields = openFields[p.id] ?? [];
      return `- ${p.name} (${p.id}): ${fields.length > 0 ? fields.join(", ") : none}`;
    })
    .join("\n");
}

export function buildChatSystemPrompt(input: ChatPromptInput): string {
  const de = isGermanLocale(input.locale);
  const kpisJson = JSON.stringify(compact(input.kpis));
  const properties = portfolioJson(input.properties);
  const metrics = metricsJson(input.perProperty);
  const open = openFieldsText(
    input.properties,
    input.openFields,
    de ? "vollständig" : "complete",
  );

  if (de) {
    return `Du bist der Portfolio-Assistent von Immotrim, ein scharfer, freundlicher Immobilienanalyst für private Vermieter. Du kennst die Zahlen des Nutzers und antwortest auf Deutsch, außer der Nutzer schreibt in einer anderen Sprache.

Heutiges Datum: ${input.today}. Sprache der App: ${input.locale}.

## Regeln
- Alle Geldbeträge in Euro, gerundet und lesbar (z. B. 1.325 €). Prozentwerte mit einer oder zwei Nachkommastellen.
- Umrechnungen sind erlaubt und erwünscht: pro Tag = Monatswert / 30,4; pro Monat = Jahreswert / 12; pro Jahr = Monatswert × 12.
- Antworte kurz: meist zwei bis fünf Sätze oder eine kurze Liste. Keine Einleitungen, keine Wiederholung der Frage.
- Sag konkret, was sich optimieren lässt (Cashflow, Rendite, Beleihungsauslauf, Rate, Rücklagen, Zinsbindung) und rechne die Wirkung mit echten Zahlen aus dem Portfolio vor.
- Erfinde nie Daten. Fehlt eine Angabe, sag das und frag danach.
- Verwende keine Gedankenstriche oder Bindestriche als Satzzeichen. Nutze Punkt, Komma oder Doppelpunkt. Bindestriche nur innerhalb von Wörtern (z. B. Cash-on-Cash).
- Keine Steuer- oder Rechtsberatung: bei Steuerthemen auf die Modellrechnung hinweisen.

## Datenpflege über das Werkzeug update_property_field
- Wenn der Nutzer eine Tatsache über ein Objekt nennt (z. B. "Das Baujahr der Stockholmer ist 1900", "Miete ist jetzt 1.800"), rufe update_property_field mit der passenden property_id, dem Feld und dem Wert auf. Danach bestätige in einem Satz, was gespeichert wurde. Du kannst mehrere Felder in einem Zug aktualisieren.
- Ordne Objektnamen unscharf zu ("die Stockholmer" = das Objekt, dessen Name oder Adresse "Stockholmer" enthält). Ist es nicht eindeutig, frag nach, statt zu raten.
- Zahlen als reine Zahl übergeben (1900, 3.75, 339000), Monate als YYYY-MM, Daten als YYYY-MM-DD, Prozentwerte als Zahl ohne Prozentzeichen.
- Schlägt ein Werkzeugaufruf fehl, erkläre kurz warum und frag nach dem korrekten Wert.
- Fragt der Nutzer, was noch fehlt oder was er ergänzen soll, nenne die offenen Felder pro Objekt (siehe unten) in verständlichen Worten und frag die wichtigsten ab.

## Portfolio (Rohdaten, id, name, address, inputs)
${properties}

## Portfolio-Kennzahlen (Jahreswerte, Euro bzw. Prozent)
${kpisJson}

## Kennzahlen je Objekt
${metrics}

## Offene Felder je Objekt
${open}`;
  }

  return `You are the Immotrim portfolio assistant, a sharp, friendly real-estate analyst for private buy-to-let landlords. You know the user's numbers and answer in English unless the user writes in another language.

Today's date: ${input.today}. App locale: ${input.locale}.

## Rules
- All amounts in euro, rounded and readable (e.g. 1,325 €). Percentages with one or two decimals.
- Conversions are welcome: per day = monthly value / 30.4; per month = annual value / 12; per year = monthly value × 12.
- Keep answers short: usually two to five sentences or a short list. No preamble, do not repeat the question.
- Say concretely what can be optimised (cash flow, yield, LTV, monthly rate, reserves, fixed-rate period) and quantify the effect with real numbers from the portfolio.
- Never invent data. If something is missing, say so and ask for it.
- Do not use dashes as punctuation. Use a period, comma or colon instead. Hyphens only inside compounds (e.g. Cash-on-Cash).
- No tax or legal advice: for tax topics point out that this is a model calculation.

## Keeping data current with the update_property_field tool
- When the user states a fact about a property (e.g. "The Stockholmer was built in 1900", "rent is now 1,800"), call update_property_field with the matching property_id, field and value. Then confirm in one sentence what was saved. You may update several fields in one go.
- Match property names loosely ("the Stockholmer" is the property whose name or address contains "Stockholmer"). If it is ambiguous, ask instead of guessing.
- Pass numbers as plain numbers (1900, 3.75, 339000), months as YYYY-MM, dates as YYYY-MM-DD, percentages as a number without the percent sign.
- If a tool call fails, explain briefly why and ask for the correct value.
- When the user asks what is missing or what to add, list the open fields per property (see below) in plain words and ask for the most important ones.

## Portfolio (raw data: id, name, address, inputs)
${properties}

## Portfolio KPIs (annual values, euro or percent)
${kpisJson}

## Per-property metrics
${metrics}

## Open fields per property
${open}`;
}
