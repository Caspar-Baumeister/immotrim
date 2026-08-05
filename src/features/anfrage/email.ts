// ─────────────────────────────────────────────────────────────────────────────
// FINANZIERUNGSANFRAGE — E-MAIL-BUILDER
//
// Pure template function: builds the German subject + body of a financing
// request for one (Konzept, Bank) pair from data the app already has. No AI —
// deterministic, unit-testable, and always a faithful rendering of the inputs.
// Empty fields are omitted rather than rendered as blanks. The text also works
// pasted into a bank's contact form (many institutions accept no email).
// ─────────────────────────────────────────────────────────────────────────────

import type { Bank } from "@/features/banks/registry";
import type { Konzept } from "@/features/konzepte/types";
import { KONZEPT_TYPE_LABELS, KONZEPT_ZWECK_LABELS } from "@/features/konzepte/types";
import type { Stammdaten, Strategie } from "@/features/profile/types";
import type { FinancingEstimate } from "@/features/financing/calculations";

const nf0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const eur = (v: number | null | undefined): string | null =>
  v == null || !Number.isFinite(v) || v === 0 ? null : `${nf0.format(Math.round(v))} €`;

export type AnfrageEmailInput = {
  bank: Bank;
  konzept: Konzept;
  stammdaten: Stammdaten;
  strategie: Strategie;
  est: FinancingEstimate;
  /** Number of owned portfolio properties (0 for first-time buyers). */
  propertyCount: number;
  /** File names the user should attach (Selbstauskunft-PDF + Unterlagen). */
  attachmentNames: string[];
};

export type AnfrageEmail = { subject: string; body: string };

// A labelled line, omitted when the value is empty.
function line(label: string, value: string | null | undefined): string | null {
  return value ? `- ${label}: ${value}` : null;
}

function block(title: string, lines: (string | null)[]): string | null {
  const kept = lines.filter((l): l is string => !!l);
  return kept.length > 0 ? `${title}\n${kept.join("\n")}` : null;
}

export function buildAnfrageEmail(input: AnfrageEmailInput): AnfrageEmail {
  const { bank, konzept, stammdaten, strategie, est, propertyCount, attachmentNames } =
    input;
  const o = konzept.objekt;
  const fin = konzept.finanzierung;

  const name = [stammdaten.vorname, stammdaten.nachname].filter(Boolean).join(" ").trim();
  const typLabel = konzept.conceptType
    ? KONZEPT_TYPE_LABELS[konzept.conceptType]
    : undefined;

  const subject = [
    "Finanzierungsanfrage",
    konzept.title,
    o.ort ? `in ${o.ort}` : null,
    name ? `— ${name}` : null,
  ]
    .filter(Boolean)
    .join(" ")
    .replace("Finanzierungsanfrage ", "Finanzierungsanfrage: ");

  // Intro differs: a Vermittler compares banks, a bank finances directly.
  const intro =
    bank.kind === "vermittler"
      ? `ich suche eine Baufinanzierung für ein konkretes Vorhaben und bitte Sie um einen Vergleich passender Bankangebote. Damit Sie geeignete Banken vorauswählen können, beschreibe ich das Konzept unten so konkret wie möglich.`
      : `ich interessiere mich für eine Baufinanzierung bei Ihrem Haus und sende Ihnen dazu meine Eckdaten und Unterlagen.`;

  const beruf = [stammdaten.beruf, stammdaten.arbeitgeber ? `bei ${stammdaten.arbeitgeber}` : null]
    .filter(Boolean)
    .join(" ");
  const ueberMich = block("Zu meiner Person:", [
    line("Name", name || null),
    line("Beruf", beruf || null),
    strategie.ueberMich ? `- ${strategie.ueberMich.trim()}` : null,
  ]);

  const konzeptBlock = block("Das Konzept:", [
    line("Vorhaben", [konzept.title, typLabel ? `(${typLabel})` : null].filter(Boolean).join(" ")),
    konzept.description ? `- ${konzept.description.trim()}` : null,
  ]);

  const objektBlock = block("Das Objekt:", [
    line("Adresse / Lage", [o.adresse, o.ort].filter(Boolean).join(", ") || null),
    line("Objektart", o.objekttyp),
    line("Wohnfläche", o.wohnflaeche ? `${nf0.format(o.wohnflaeche)} m²` : null),
    line("Zimmer", o.zimmer ? String(o.zimmer) : null),
    line("Baujahr", o.baujahr ? String(o.baujahr) : null),
    line("Kaufpreis", eur(o.kaufpreis)),
    line("Erwartete Kaltmiete", eur(o.erwarteteMiete) ? `${eur(o.erwarteteMiete)} / Monat` : null),
  ]);

  const finBlock = block("Finanzierungswunsch:", [
    line("Zweck", fin.zweck ? KONZEPT_ZWECK_LABELS[fin.zweck] : null),
    line("Darlehensbetrag", eur(fin.darlehensbetrag)),
    line("Eigenkapital", eur(fin.eigenkapital)),
    line("Zinsbindung", fin.zinsbindungJahre ? `${fin.zinsbindungJahre} Jahre` : null),
    line("Anfängliche Tilgung", fin.tilgungPct ? `${fin.tilgungPct.toLocaleString("de-DE")} % p.a.` : null),
    line("Weitere Wünsche", fin.wuensche?.trim() || null),
  ]);

  const bonitaet = block("Zu meiner finanziellen Situation (Schätzung, Details in den Anlagen):", [
    line("Monatliche Sparrate", eur(est.sparrate) ? `ca. ${eur(est.sparrate)}` : null),
    line("Verfügbares Eigenkapital", eur(est.verfuegbaresEigenkapital) ? `ca. ${eur(est.verfuegbaresEigenkapital)}` : null),
    propertyCount > 0
      ? line(
          "Bestandsimmobilien",
          `${propertyCount} ${propertyCount === 1 ? "Objekt" : "Objekte"}${
            eur(est.immobilienCashflow)
              ? `, monatlicher Cashflow ca. ${eur(est.immobilienCashflow)}`
              : ""
          }`,
        )
      : null,
  ]);

  const anlagen =
    attachmentNames.length > 0
      ? block(
          "Anlagen:",
          attachmentNames.map((n) => `- ${n}`),
        )
      : null;

  const closing = [
    "Über eine Rückmeldung, welche Konditionen Sie mir anbieten können und welche Unterlagen Sie noch benötigen, freue ich mich.",
    "",
    "Mit freundlichen Grüßen",
    name || null,
    stammdaten.telefon || null,
    stammdaten.email || null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  const body = [
    "Sehr geehrte Damen und Herren,",
    "",
    intro,
    "",
    [konzeptBlock, objektBlock, finBlock, ueberMich, bonitaet, anlagen]
      .filter(Boolean)
      .join("\n\n"),
    "",
    closing,
  ].join("\n");

  return { subject, body };
}

// mailto: URLs get truncated by some clients around ~2000 chars — the UI treats
// the copy buttons as primary and this link as a convenience.
export function buildMailtoUrl(email: string, mail: AnfrageEmail): string {
  return `mailto:${email}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
}
