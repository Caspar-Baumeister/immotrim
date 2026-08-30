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
        info: "Die lebenslange steuerliche Identifikationsnummer (11-stellig) — nicht zu verwechseln mit der Steuernummer des Finanzamts. Sie steht auf jedem Steuerbescheid, deiner Lohnabrechnung oder dem Schreiben des Bundeszentralamts für Steuern.",
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
        info: "Bestimmt, welche Einkommensnachweise die Bank verlangt: Angestellte/Beamte → Gehaltsabrechnungen; Selbständige → BWA und Steuerbescheide; Rentner → Rentenbescheid.",
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
        info: "Der Betrag, der monatlich auf deinem Konto landet — laut Gehaltsabrechnung „Auszahlungsbetrag“. Bei mehreren Gehältern pro Jahr rechnen wir das über „Gehälter pro Jahr“ auf den Jahreswert hoch. Mieteinnahmen aus deinen Objekten gehören NICHT hierher, die ergänzen wir automatisch.",
      },
      {
        key: "anzahlGehaelter",
        label: "Gehälter pro Jahr",
        type: "number",
        presets: [12, 13],
        fullWidth: true,
        description: "Meist 12, mit Weihnachts-/Urlaubsgeld 13 oder 14.",
      },
      {
        key: "kindergeld",
        label: "Kindergeld",
        type: "number",
        suffix: "€",
        widget: "benefit",
        perUnit: 259,
        unitPresets: [1, 2, 3, 4],
        enableLabel: "Ja, ich beziehe Kindergeld",
        unitSingular: "Kind",
        unitPlural: "Kinder",
        fullWidth: true,
      },
      {
        key: "weitereEinkuenfte",
        label: "Weitere Einkünfte",
        type: "number",
        suffix: "€",
        description: "Z. B. Unterhalt oder Nebentätigkeit — ohne Immobilien.",
        info: "Regelmäßige Zusatzeinnahmen neben deinem Gehalt: Unterhalt, Minijob/Nebentätigkeit, Renten oder Zuschüsse. Mieteinnahmen aus deinen Objekten gehören NICHT hierher — die zieht die Bank direkt aus deinen Immobilien.",
      },
    ],
  },
  {
    title: "Ausgaben",
    icon: Receipt,
    description:
      "Deine laufenden monatlichen Kosten. Die Bank prüft, was dir am Monatsende zum Sparen und Tilgen übrig bleibt.",
    fields: [
      {
        key: "mietausgaben",
        label: "Eigene Miete/Wohnkosten",
        type: "number",
        suffix: "€",
        info: "Die Warmmiete deiner selbst bewohnten Wohnung. Wohnst du im Eigentum, trage hier das Hausgeld/die laufenden Wohnkosten ein. Kosten deiner vermieteten Objekte gehören NICHT hierher.",
      },
      {
        key: "lebenshaltung",
        label: "Lebenshaltung",
        type: "number",
        suffix: "€",
        description: "Essen, Mobilität, Freizeit — grober Richtwert genügt.",
        info: "Alle privaten Lebenshaltungskosten: Essen, Kleidung, Mobilität, Freizeit, Kommunikation. Ein realistischer Richtwert genügt — die Bank rechnet ohnehin mit eigenen Pauschalen gegen.",
        estimate: {
          kind: "tiers",
          note: "Richtwerte, wie Banken sie typischerweise ansetzen — du kannst auch einen eigenen Betrag eintragen.",
          tiers: [
            { label: "1 Person", amount: 900 },
            { label: "2 Personen", amount: 1150 },
            { label: "3 Personen", amount: 1400 },
            { label: "4+ Personen", amount: 1650 },
          ],
          customLabel: "Eigener Betrag",
          placeholder: "z. B. 1200",
        },
      },
      {
        key: "krankenversicherung",
        label: "Krankenversicherung",
        type: "number",
        suffix: "€",
        info: "Nur eintragen, wenn du den Beitrag selbst zahlst — also privat versichert oder freiwillig gesetzlich. Bei Angestellten in der gesetzlichen Kasse ist der Beitrag schon vom Netto abgezogen; dann wähle „Gesetzlich versichert“ — wir rechnen mit 0 €.",
        estimate: {
          kind: "tiers",
          note: "Gesetzlich Versicherte zahlen den Beitrag bereits über das Netto — dann zählt hier 0 €.",
          tiers: [
            {
              label: "Gesetzlich versichert",
              amount: 0,
              hint: "bereits im Netto enthalten",
            },
          ],
          customLabel: "Privat versichert",
          placeholder: "z. B. 450",
        },
      },
      {
        key: "versicherungen",
        label: "Weitere Versicherungen",
        type: "number",
        suffix: "€",
        info: "Monatssumme sonstiger Policen: Haftpflicht, Hausrat, Berufsunfähigkeit, Lebens-/Rentenversicherung, Kfz. Die Krankenversicherung NICHT doppelt zählen.",
        estimate: {
          kind: "multiPick",
          note: "Wähle aus, was du hast — wir rechnen mit typischen Monatsbeiträgen. Du kannst auch direkt einen eigenen Betrag eintragen.",
          items: [
            { id: "haftpflicht", label: "Privathaftpflicht", amount: 8 },
            { id: "hausrat", label: "Hausrat", amount: 12 },
            { id: "kfz", label: "Kfz-Versicherung", amount: 85 },
            { id: "bu", label: "Berufsunfähigkeit", amount: 65 },
            { id: "rechtsschutz", label: "Rechtsschutz", amount: 25 },
            { id: "risikoleben", label: "Risikoleben", amount: 15 },
          ],
          customLabel: "Eigener Betrag",
          placeholder: "Summe mtl.",
        },
      },
      { key: "ratenkredite", label: "Ratenkredite (Rate)", type: "number", suffix: "€", description: "Summe aller monatlichen Kreditraten.", info: "Nur monatliche Raten laufender Konsumkredite: Auto-, Ratenkauf-, Möbel- oder Privatkredit sowie Leasing. Immobilien­finanzierungen gehören NICHT hierher — die Annuitäten deiner Objekte kennt die Bank bereits aus deinen Immobilien." },
      {
        key: "sonstigeAusgaben",
        label: "Sonstige Ausgaben",
        type: "number",
        suffix: "€",
        presets: [0, 100, 250],
        info: "Regelmäßige Ausgaben, die oben nicht passen: z. B. Unterhaltszahlungen, Sparpläne, Abos oder Vereinsbeiträge.",
      },
    ],
  },
  {
    title: "Vermögen",
    icon: Banknote,
    description:
      "Was du an Eigenkapital mitbringst. Das bestimmt, wie viel Finanzierung die Bank dir zutraut.",
    fields: [
      { key: "bankSparguthaben", label: "Bank- und Sparguthaben", type: "number", suffix: "€", info: "Verfügbares Guthaben auf Giro-, Tagesgeld- und Sparkonten. Dieser Bestand (nicht monatlich) zeigt der Bank dein sofort einsetzbares Eigenkapital." },
      { key: "wertpapiere", label: "Wertpapiere / Aktien", type: "number", suffix: "€", info: "Aktueller Depotwert: Aktien, ETFs, Fonds und Anleihen. Grober Kurswert genügt — er zählt als teilweise beleihbares Eigenkapital." },
      { key: "sonstigesVermoegen", label: "Sonstiges Vermögen", type: "number", suffix: "€", description: "Z. B. Bausparverträge, Lebensversicherungen.", info: "Weitere Vermögenswerte: Bausparverträge, Rückkaufswert von Lebensversicherungen, Edelmetalle, Beteiligungen. Deine Immobilien NICHT hier eintragen — die erfasst du unter „Immobilien“." },
      {
        key: "ekVerfuegbar",
        label: "Davon für einen Kauf einsetzbar",
        type: "number",
        suffix: "€",
        fullWidth: true,
        description: "Wie viel Eigenkapital du beim nächsten Kauf einbringen willst.",
        info: "Der Teil deiner liquiden Mittel (Bank/Spar + Wertpapiere), den du für den nächsten Erwerb einsetzen würdest. Der Rest erscheint in der Selbstauskunft als Liquiditätsreserve nach Kauf — Banken sehen daran sofort, dass du dich nicht auf null ziehst.",
      },
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
        info: "Die gesamte offene Restschuld deiner Konsum- und Ratenkredite (nicht die monatliche Rate — die steht unter Ausgaben). Immobiliendarlehen gehören NICHT hierher; die Restschulden deiner Objekte kennt die Bank aus deinen Immobilien.",
      },
    ],
  },
];

// Labels + numeric keys for the extraction review panel, per section.
const STAMMDATEN_LABELS: Record<string, string> = {
  anrede: "Anrede",
  vorname: "Vorname",
  nachname: "Nachname",
  geburtsdatum: "Geburtsdatum",
  geburtsort: "Geburtsort",
  familienstand: "Familienstand",
  telefon: "Telefon",
  email: "E-Mail",
  strasse: "Straße, Hausnummer",
  plzOrt: "PLZ, Ort",
  wohnhaftSeit: "Wohnhaft seit",
  anzahlKinder: "Anzahl Kinder",
  staatsangehoerigkeit: "Staatsangehörigkeit",
  steuerId: "Steuer-ID",
  beschaeftigung: "Art der Beschäftigung",
  arbeitgeber: "Arbeitgeber",
  beruf: "Beruf",
  beschaeftigtSeit: "Beschäftigt seit",
  kontoinhaber: "Kontoinhaber",
  kreditinstitut: "Kreditinstitut",
  iban: "IBAN",
  bic: "BIC",
};

const HAUSHALT_LABELS: Record<string, string> = {
  nettoeinkommen: "Nettoeinkommen",
  anzahlGehaelter: "Gehälter pro Jahr",
  kindergeld: "Kindergeld",
  weitereEinkuenfte: "Weitere Einkünfte",
  mietausgaben: "Eigene Miete/Wohnkosten",
  lebenshaltung: "Lebenshaltung",
  krankenversicherung: "Krankenversicherung",
  versicherungen: "Weitere Versicherungen",
  ratenkredite: "Ratenkredite (Rate)",
  sonstigeAusgaben: "Sonstige Ausgaben",
  bankSparguthaben: "Bank- und Sparguthaben",
  wertpapiere: "Wertpapiere / Aktien",
  sonstigesVermoegen: "Sonstiges Vermögen",
  ekVerfuegbar: "Davon für einen Kauf einsetzbar",
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
