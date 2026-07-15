import {
  Banknote,
  Briefcase,
  Building2,
  CreditCard,
  HeartCrack,
  HeartHandshake,
  Landmark,
  MapPin,
  Receipt,
  Scale,
  TreePalm,
  User,
  UserRound,
  Wallet,
} from "lucide-react";
import type {
  ExtractionAdapter,
  ExtractedBag,
} from "@/features/extraction/DocumentUploadCore";
import type { ProfileFieldGroup } from "./components/ProfileForm";

// ── Stammdaten form layout ────────────────────────────────────────────────────
export const STAMMDATEN_GROUPS: ProfileFieldGroup[] = [
  {
    title: "Person",
    icon: User,
    description:
      "Wer bist du? Diese Angaben identifizieren dich gegenüber der Bank. Fülle nur aus, was du kennst — den Rest liest die KI aus deinem Ausweis aus.",
    fields: [
      {
        key: "anrede",
        label: "Anrede",
        type: "select",
        options: [
          { value: "herr", label: "Herr", icon: User },
          { value: "frau", label: "Frau", icon: UserRound },
        ],
      },
      { key: "vorname", label: "Vorname", type: "text" },
      { key: "nachname", label: "Nachname", type: "text" },
      { key: "geburtsdatum", label: "Geburtsdatum", type: "date" },
      { key: "geburtsort", label: "Geburtsort", type: "text" },
      { key: "staatsangehoerigkeit", label: "Staatsangehörigkeit", type: "text" },
      {
        key: "familienstand",
        label: "Familienstand",
        type: "select",
        options: [
          { value: "ledig", label: "Ledig", icon: User },
          { value: "verheiratet", label: "Verheiratet", icon: HeartHandshake },
          { value: "geschieden", label: "Geschieden", icon: HeartCrack },
          { value: "verwitwet", label: "Verwitwet", icon: UserRound },
        ],
      },
      {
        key: "steuerId",
        label: "Steuer-ID",
        type: "text",
        description: "11-stellig, steht auf deinem Steuerbescheid oder Lohnzettel.",
      },
    ],
  },
  {
    title: "Kontakt & Anschrift",
    icon: MapPin,
    description:
      "Deine aktuelle Adresse und wie die Bank dich erreicht. „Wohnhaft seit“ zeigt, wie stabil dein Wohnsitz ist.",
    fields: [
      { key: "telefon", label: "Telefon", type: "text" },
      { key: "email", label: "E-Mail", type: "text" },
      { key: "strasse", label: "Straße, Hausnummer", type: "text", fullWidth: true },
      { key: "plzOrt", label: "PLZ, Ort", type: "text" },
      { key: "wohnhaftSeit", label: "Wohnhaft seit", type: "month" },
      {
        key: "anzahlKinder",
        label: "Anzahl Kinder",
        type: "number",
        description: "Unterhaltspflichtige Kinder im Haushalt.",
      },
    ],
  },
  {
    title: "Beschäftigung",
    icon: Briefcase,
    description:
      "Deine Einkommensquelle. Die Beschäftigungsart bestimmt, welche Nachweise die Bank verlangt.",
    fields: [
      {
        key: "beschaeftigung",
        label: "Art der Beschäftigung",
        type: "select",
        fullWidth: true,
        options: [
          { value: "angestellter", label: "Angestellter", icon: Briefcase },
          { value: "beamter", label: "Beamter", icon: Landmark },
          { value: "selbstaendiger", label: "Selbständig", icon: Building2 },
          { value: "rentner", label: "Rentner", icon: TreePalm },
        ],
      },
      { key: "arbeitgeber", label: "Arbeitgeber", type: "text" },
      { key: "beruf", label: "Beruf", type: "text" },
      { key: "beschaeftigtSeit", label: "Beschäftigt seit", type: "month" },
    ],
  },
  {
    title: "Kontoverbindung",
    icon: CreditCard,
    description:
      "Das Konto, über das die Finanzierung läuft. Diese Angaben brauchst du erst zur Auszahlung — du kannst sie auch später ergänzen.",
    fields: [
      { key: "kontoinhaber", label: "Kontoinhaber", type: "text" },
      { key: "kreditinstitut", label: "Kreditinstitut", type: "text" },
      { key: "iban", label: "IBAN", type: "text", fullWidth: true },
      { key: "bic", label: "BIC", type: "text" },
    ],
  },
];

// ── Haushaltsrechnung form layout ─────────────────────────────────────────────
export const HAUSHALT_GROUPS: ProfileFieldGroup[] = [
  {
    title: "Einnahmen",
    icon: Wallet,
    description:
      "Was monatlich reinkommt. Nutze dein Netto laut Gehaltsabrechnung — Mieteinnahmen aus deinen Objekten ergänzen wir automatisch.",
    fields: [
      {
        key: "nettoeinkommen",
        label: "Nettoeinkommen",
        type: "number",
        suffix: "€",
        description: "Monatlich, nach Steuern und Sozialabgaben.",
      },
      {
        key: "anzahlGehaelter",
        label: "Gehälter pro Jahr",
        type: "number",
        description: "Meist 12, mit Weihnachts-/Urlaubsgeld 13 oder 14.",
      },
      {
        key: "weitereEinkuenfte",
        label: "Weitere Einkünfte",
        type: "number",
        suffix: "€",
        description: "Z. B. Kindergeld oder Nebentätigkeit — ohne Immobilien.",
      },
    ],
  },
  {
    title: "Ausgaben",
    icon: Receipt,
    description:
      "Deine laufenden monatlichen Kosten. Die Bank prüft, was dir am Monatsende zum Sparen und Tilgen übrig bleibt.",
    fields: [
      { key: "mietausgaben", label: "Eigene Miete/Wohnkosten", type: "number", suffix: "€" },
      { key: "lebenshaltung", label: "Lebenshaltung", type: "number", suffix: "€", description: "Essen, Mobilität, Freizeit — grober Richtwert genügt." },
      { key: "krankenversicherung", label: "Krankenversicherung", type: "number", suffix: "€" },
      { key: "versicherungen", label: "Weitere Versicherungen", type: "number", suffix: "€" },
      { key: "ratenkredite", label: "Ratenkredite (Rate)", type: "number", suffix: "€", description: "Summe aller monatlichen Kreditraten." },
      { key: "sonstigeAusgaben", label: "Sonstige Ausgaben", type: "number", suffix: "€" },
    ],
  },
  {
    title: "Vermögen",
    icon: Banknote,
    description:
      "Was du an Eigenkapital mitbringst. Das bestimmt, wie viel Finanzierung die Bank dir zutraut.",
    fields: [
      { key: "bankSparguthaben", label: "Bank- und Sparguthaben", type: "number", suffix: "€" },
      { key: "wertpapiere", label: "Wertpapiere / Aktien", type: "number", suffix: "€" },
      { key: "sonstigesVermoegen", label: "Sonstiges Vermögen", type: "number", suffix: "€", description: "Z. B. Bausparverträge, Lebensversicherungen." },
    ],
  },
  {
    title: "Verbindlichkeiten",
    icon: Scale,
    description:
      "Bestehende Schulden außer deinen Immobiliendarlehen — die kennt die Bank bereits aus deinen Objekten.",
    fields: [
      {
        key: "sonstigeVerbindlichkeiten",
        label: "Sonstige Verbindlichkeiten (gesamt)",
        type: "number",
        suffix: "€",
        fullWidth: true,
        description: "Restschuld aller Konsum-/Ratenkredite, ohne Immobilien.",
      },
    ],
  },
];

// Labels + numeric keys for the extraction review panel, per section.
const STAMMDATEN_LABELS: Record<string, string> = {
  vorname: "Vorname",
  nachname: "Nachname",
  geburtsdatum: "Geburtsdatum",
  geburtsort: "Geburtsort",
  telefon: "Telefon",
  email: "E-Mail",
  strasse: "Straße, Hausnummer",
  plzOrt: "PLZ, Ort",
  staatsangehoerigkeit: "Staatsangehörigkeit",
  steuerId: "Steuer-ID",
  arbeitgeber: "Arbeitgeber",
  beruf: "Beruf",
  beschaeftigtSeit: "Beschäftigt seit",
};

const HAUSHALT_LABELS: Record<string, string> = {
  nettoeinkommen: "Nettoeinkommen",
  anzahlGehaelter: "Gehälter pro Jahr",
  mietausgaben: "Eigene Miete/Wohnkosten",
  bankSparguthaben: "Bank- und Sparguthaben",
  wertpapiere: "Wertpapiere / Aktien",
  ratenkredite: "Ratenkredite (Rate)",
  sonstigeVerbindlichkeiten: "Sonstige Verbindlichkeiten",
};

const nf = new Intl.NumberFormat("de-DE");

/**
 * Build an ExtractionAdapter that reviews AI-extracted fields against the live
 * section form state and applies the accepted ones back into it.
 */
export function makeSectionAdapter(opts: {
  mode: "stammdaten" | "haushalt";
  getValue: (key: string) => string | number | undefined;
  applyPatch: (patch: Record<string, string | number>) => void;
}): ExtractionAdapter {
  const isHaushalt = opts.mode === "haushalt";
  const labels = isHaushalt ? HAUSHALT_LABELS : STAMMDATEN_LABELS;
  const numberKeys = isHaushalt;

  return {
    mode: opts.mode,
    fieldOrder: Object.keys(labels),
    isPresent: (fields: ExtractedBag, key) => fields[key] !== undefined,
    fieldFor: (fields: ExtractedBag, key) => fields[key]!,
    label: (key) => labels[key] ?? key,
    currentValue: (key) => opts.getValue(key),
    formatValue: (key, value) => {
      if (value == null || value === "") return "—";
      return numberKeys ? nf.format(Number(value)) : String(value);
    },
    apply: (selectedKeys, fields) => {
      const patch: Record<string, string | number> = {};
      for (const k of selectedKeys) {
        const f = fields[k];
        if (f) patch[k] = f.value;
      }
      opts.applyPatch(patch);
    },
  };
}
