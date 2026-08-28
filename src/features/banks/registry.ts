// ─────────────────────────────────────────────────────────────────────────────
// BANK REGISTRY
//
// The "Banken" section renders one card per entry here (grouped by `kind`), and
// each bank can have its own Selbstauskunft form pre-filled from the user's
// portfolio (see documents.tsx — banks without a form still get the Anfrage
// flow). Adding a bank = add an entry here; a custom document component is
// optional. This module is import-safe from both server and client (pure data).
//
// Contact channels: many institutions publish NO inquiry email — only a contact
// form. `email` is set ONLY where a real address is published (never invented);
// otherwise `contactUrl` points at the official form/appointment page.
// ─────────────────────────────────────────────────────────────────────────────

import type { BankFinancingCriteria } from "@/features/financing/calculations";

export type BankKind = "bank" | "vermittler";

// A published contact person for financing inquiries. Only ever filled from the
// institution's own website (team pages, branch pages, Impressum) — same
// never-invent rule as `email` on Bank.
export type BankAnsprechpartner = {
  /** Full name as published. */
  name: string;
  /** "Herr" | "Frau" — only if derivable from the institution's own page; drives the salutation. */
  anrede?: "Herr" | "Frau";
  /** Role/title, e.g. "Spezialistin Baufinanzierung". */
  rolle?: string;
  /** Branch/location, e.g. "Filiale Potsdam". */
  standort?: string;
  telefon?: string;
  email?: string;
};

// What the bank finances — structured criteria for the expandable
// "Was finanziert diese Bank?" section on the bank card. Same sourcing rule as
// the contact data: only published values (Stand im Kommentar), Drittquellen im
// Text als solche gekennzeichnet.
export type BankFinanzierungsInfo = {
  /** Finanziert vermietete Objekte / Kapitalanlage? "unklar" = nicht publiziert. */
  kapitalanlage: "ja" | "unklar" | "nein";
  /** Freitext dazu (EK-Erwartung, Mietanrechnung, Reserven …). */
  kapitalanlageHinweis?: string;
  /** Geschäftsgebiet / regionale Beschränkung; weglassen = bundesweit bzw. keine publiziert. */
  region?: string;
  /** Mindest-/Höchstdarlehen in €. */
  minDarlehen?: number;
  maxDarlehen?: number;
  /** Mindestwohnfläche vermieteter Objekte in m². */
  minObjektflaeche?: number;
  /** Max. Beleihung/Finanzierung als Text (Nuancen wie "100% + Nebenkosten im Einzelfall"). */
  maxBeleihung?: string;
  /** Anrechnung der Mieteinnahmen in der Haushaltsrechnung (%-Quote, Mietansatz-Caps, Bewirtschaftungsabzüge). */
  mietanrechnung?: string;
  /** Eigenkapital-Anforderung speziell bei vermieteten Objekten. */
  ekKapitalanlage?: string;
  /** Haltung zu möblierten Apartments / Mikroapartments / Betreiberkonzepten. */
  mikroapartments?: string;
  /** Bereitstellungszinsfreie Zeit, z.B. "6 Monate". */
  bereitstellungszinsfrei?: string;
  /** Angebotene Zinsbindungen, z.B. "5–20 Jahre". */
  zinsbindungen?: string;
  /** Hinweis zu Selbständigen. */
  selbststaendige?: string;
  /** Weitere harte Kriterien / Besonderheiten. */
  besonderheiten?: string[];
};

export type Bank = {
  /** URL-safe id; also the segment in /selbstauskunft/document/[bankId]/… */
  id: string;
  /** Direct/regional bank vs. Vermittler (broker comparing many banks). */
  kind: BankKind;
  /** Full legal name shown on the card. */
  name: string;
  /** Short label / abbreviation. */
  shortName: string;
  /** City, used on the form's Darlehensvermittlung section (e.g. "MBS in Potsdam"). */
  city: string;
  /** Optional logo path under /public. */
  logo?: string;
  /** Published contact address for inquiries — only if the institution publishes one. */
  email?: string;
  /** Official contact-form / financing-inquiry page (for form-first institutions). */
  contactUrl?: string;
  /** Published financing hotline / central number. */
  telefon?: string;
  /** Published contact person for financing inquiries (personalizes the Anfrage email). */
  ansprechpartner?: BankAnsprechpartner;
  /** Public website. */
  website?: string;
  /** Lending criteria used for the fit score + displayed conditions. */
  conditions?: BankFinancingCriteria;
  /** Structured "was finanziert diese Bank?" details (expandable on the card). */
  finanzierungsInfo?: BankFinanzierungsInfo;
};

// Ids that have a bank-specific Selbstauskunft document component wired up in
// documents.tsx. Kept here (pure data) so client code can check availability
// without importing the print components.
export const BANK_IDS_WITH_DOCUMENT = ["mbs"] as const;

// Pseudo id for the bank-neutral "Private Selbstauskunft" Immotrim generates for
// the user (Dashboard/Checkliste). Not a bank: never in BANKS or
// BANK_IDS_WITH_DOCUMENT, but registered in documents.tsx and accepted by the
// /api/selbstauskunft route. Must never collide with a real bank id.
export const GENERIC_SELBSTAUSKUNFT_ID = "immotrim";

export function hasBankDocument(bankId: string): boolean {
  return (BANK_IDS_WITH_DOCUMENT as readonly string[]).includes(bankId);
}

// NOTE: conditions/email/telefon/contactUrl/ansprechpartner below are indicative
// values researched from the institutions' public pages (Stand 07–08/2026) — a
// starting point for contact, NOT verified offers. Verify current terms and the
// right recipient before relying on them. Deliberately NOT listed: Santander
// (Baufi-Neugeschäft seit 04/2024 eingestellt), Münchener Hyp (kein
// Direktvertrieb, nur über Volks-/Sparda-/PSD-Banken und Vermittler), PSD Bank
// Berlin-Brandenburg (zum 01.09.2025 in der BBBank aufgegangen).
export const BANKS: Bank[] = [
  // ── Banken (direkt/regional) ───────────────────────────────────────────────
  {
    id: "mbs",
    kind: "bank",
    name: "Mittelbrandenburgische Sparkasse",
    shortName: "MBS",
    city: "Potsdam",
    email: "info@mbs.de",
    website: "https://www.mbs.de",
    conditions: {
      zinsAb: 3.6,
      maxLtv: 90,
      minEinkommenMonatlich: 1500,
    },
    // Kriterien recherchiert 08/2026; Drittquellen im Text gekennzeichnet.
    finanzierungsInfo: {
      kapitalanlage: "unklar",
      kapitalanlageHinweis:
        "Baufi-Seiten adressieren nur Eigennutzung, kein expliziter Ausschluss — im Gespräch klären.",
      ekKapitalanlage:
        "Auch ohne EK möglich (höhere Zinsen), Empfehlung 20–30% — Angabe gilt allgemein, nicht Kapitalanlage-spezifisch.",
      region: "Geschäftsgebiet westliches/mittleres Brandenburg (Potsdam)",
      bereitstellungszinsfrei: "12 Monate für Neubau (Aktion bis 18.12.2026)",
      zinsbindungen: "5–30 Jahre",
      selbststaendige: "Ja — Steuerbescheide + BWA erforderlich",
      besonderheiten: [
        "Vermittelt zusätzlich Fremdbanken-Baufinanzierungen über die eigene Plattform (finmas).",
      ],
    },
  },
  {
    id: "berliner-sparkasse",
    kind: "bank",
    name: "Berliner Sparkasse",
    shortName: "Berliner Sparkasse",
    city: "Berlin",
    website: "https://www.berliner-sparkasse.de",
    // Kein veröffentlichtes Anfrage-Postfach — Kontakt über Terminanfrage/Formular.
    contactUrl: "https://www.berliner-sparkasse.de/de/home/toolbar/kontakt.html",
    finanzierungsInfo: {
      kapitalanlage: "ja",
      kapitalanlageHinweis:
        "Nettokaltmiete soll mind. Zinslast + nicht umlegbare Kosten decken.",
      mietanrechnung:
        "Nur nachhaltige Mieten (z.B. Berliner Mietspiegel) — Möblierungszuschläge werden ausdrücklich nicht angesetzt.",
      ekKapitalanlage: "Mind. Kaufnebenkosten (8–12% des Kaufpreises) aus Eigenkapital.",
      mikroapartments:
        "Kritische Haltung: Möblierungs-/Sondermieten gelten als nicht nachhaltig planbar.",
      region: "Geschäftsgebiet Berlin",
      zinsbindungen: "5–20 Jahre",
      selbststaendige: "Ja — 2 Steuerbescheide, BWA, Jahresabschlüsse",
      besonderheiten: [
        "Eigenes Segment für Investoren/Vermieter inkl. MFH; Grenze zum Firmenkundengeschäft nicht publiziert.",
        "Keine Finanzierung bei drohender Insolvenz oder Vollstreckungsmaßnahmen der letzten 5 Jahre.",
      ],
    },
  },
  {
    id: "berliner-volksbank",
    kind: "bank",
    name: "Berliner Volksbank eG",
    shortName: "Berliner Volksbank",
    city: "Berlin",
    website: "https://www.berliner-volksbank.de",
    contactUrl:
      "https://www.berliner-volksbank.de/privatkunden/immobilien/baufinanzierung.html",
    finanzierungsInfo: {
      kapitalanlage: "unklar",
      kapitalanlageHinweis:
        "Privatkunden-Seiten adressieren nur Eigennutzung; die Tochter BVBI vermarktet aber aktiv Anlageobjekte — im Gespräch klären.",
      region: "Geschäftsgebiet Berlin und Brandenburg (~60 Standorte)",
      zinsbindungen: "5–20 Jahre",
      besonderheiten: [
        "Baufi-Rechner vergleicht über 500 Finanzierungspartner — vermittelt auch fremde Darlehensgeber.",
        "Nimmt private Baukredite laut Drittquelle erst ab 750.000 € ins eigene Buch — darunter reine Vermittlung.",
        "MFH/Zinshäuser über die gewerbliche Immobilienfinanzierung, ausdrücklich auch für private Investoren.",
      ],
    },
  },
  {
    id: "ing",
    kind: "bank",
    name: "ING-DiBa AG",
    shortName: "ING",
    city: "Frankfurt am Main",
    website: "https://www.ing.de",
    // Kapitalanlage-Finanzierungsanfrage (formularbasiert, kein E-Mail-Einstieg).
    contactUrl: "https://www.ing.de/baufinanzierung/kapitalanlage/",
    finanzierungsInfo: {
      kapitalanlage: "ja",
      mietanrechnung:
        "Ohne Mietnachweis Ansatz max. 9 €/m² (Berlin fällt NICHT unter die 11-€-Großstadtliste); Bewirtschaftungspauschale 1,10 €/m² + 50 € Verwaltungspauschale je vermieteter Einheit.",
      ekKapitalanlage:
        "100%-Finanzierung des Kaufpreises seit 07/2026 explizit auch für Kapitalanleger (Haushaltsnetto ≥7.000 €, Überschuss ≥1.500 €, Obligo ≤1,5 Mio. €, max. 3 Wohneinheiten); Nebenkosten stets aus EK.",
      mikroapartments:
        "Mindestfläche 30 m² (seit 24.11.2025, vorher 40 m²); zu Betreiberkonzepten/Boardinghouses keine publizierte Aussage.",
      minDarlehen: 75000,
      minObjektflaeche: 30,
      maxBeleihung: "95% von Kaufpreis/Herstellungskosten (100%-Programm s. EK)",
      bereitstellungszinsfrei: "6 Monate",
      zinsbindungen: "5, 10 oder 15 Jahre",
      selbststaendige: "Ja — mit erweiterten Unterlagen",
      besonderheiten: [
        "Bis 3 Wohneinheiten regulär — MFH ab 4 Einheiten nur eingeschränkt.",
        "200-km-Entfernungsgrenze für Kapitalanleger seit 09/2025 gestrichen (Drittquelle).",
        "Nur EFH/DHH/RH/ZFH/MFH bzw. nach WEG geteilte Objekte; Objekt muss in Deutschland liegen.",
      ],
    },
  },
  {
    id: "dkb",
    kind: "bank",
    name: "Deutsche Kreditbank AG",
    shortName: "DKB",
    city: "Berlin",
    website: "https://www.dkb.de",
    contactUrl: "https://www.dkb.de/privatkunden/baufinanzierung",
    finanzierungsInfo: {
      kapitalanlage: "ja",
      kapitalanlageHinweis: "Eigenes Vermieterpaket für private Vermieter.",
      ekKapitalanlage:
        "Kaufnebenkosten aus EK empfohlen (Faustregel ~25%); 100–110%-Finanzierung nur in Ausnahmefällen mit Zinsaufschlag (Drittquelle).",
      bereitstellungszinsfrei: "6 Monate (Drittquelle)",
      zinsbindungen: "5–30 Jahre",
      selbststaendige:
        "Laut Drittquelle stark eingeschränkt — bevorzugt etablierte Freiberufler (Arzt, Notar, StB)",
      besonderheiten: [
        "Mehrfamilienhäuser bis 10 Wohneinheiten im Privatkundengeschäft (Drittquelle), darüber Geschäftskundenbereich Wohnungswirtschaft.",
        "Endfälliges Darlehen mit Tilgungsaussetzung möglich (Drittquelle).",
        "Mindestdarlehen ca. 20.000 € (Drittquelle).",
      ],
    },
  },
  {
    id: "sparda-berlin",
    kind: "bank",
    name: "Sparda-Bank Berlin eG",
    shortName: "Sparda Berlin",
    city: "Berlin",
    email: "hallo@sparda-berlin.de",
    telefon: "030 42080420",
    website: "https://www.sparda-b.de",
    contactUrl: "https://www.sparda-berlin.de/termin",
    finanzierungsInfo: {
      kapitalanlage: "unklar",
      kapitalanlageHinweis:
        "Eigenkonditionen gelten nur für eigengenutzte Immobilien wirtschaftlich unselbständiger Personen; vermietete Objekte ggf. über das Vermittlungsgeschäft (400+ Darlehensgeber).",
      region:
        "Ostdeutschland (Berlin, Brandenburg, MV, Sachsen, Sachsen-Anhalt, Thüringen)",
      zinsbindungen: "10 oder 15 Jahre fest, auch variabel",
      selbststaendige:
        "Eigenprodukt nur für wirtschaftlich Unselbständige — Selbständige allenfalls über die Vermittlung",
      besonderheiten: ["Genossenschaftsbank — Mitgliedschaft erforderlich."],
    },
  },
  {
    id: "commerzbank",
    kind: "bank",
    name: "Commerzbank AG",
    shortName: "Commerzbank",
    city: "Frankfurt am Main",
    telefon: "069 98660900",
    website: "https://www.commerzbank.de",
    // Kein Baufi-Postfach publiziert — Einstieg über Terminvereinbarung.
    contactUrl:
      "https://www.commerzbank.de/privatkunden/immobilienkredite/baufinanzierung/",
    conditions: {
      zinsAb: 4.2, // eff. Aktionszins 10J, bis 60% Beleihung — indikativ 08/2026
    },
    finanzierungsInfo: {
      kapitalanlage: "ja",
      ekKapitalanlage:
        "Empfohlen 20–30% EK für günstige Konditionen; Vollfinanzierung nur bei sehr guter Bonität/Lage.",
      maxBeleihung: "Vollfinanzierung grundsätzlich möglich",
      bereitstellungszinsfrei: "6 Monate (grüne Baufinanzierung bis 24 Monate)",
      zinsbindungen: "Bis 40 Jahre (Drittquelle)",
      besonderheiten: [
        "Auch endfällige Darlehen und 1–5 tilgungsfreie Anlaufjahre (Drittquelle).",
        "Vermietete Wohneinheiten explizit finanzierbar; Mindestdarlehen ca. 25.000 € (Drittquelle).",
      ],
    },
  },
  {
    id: "deutsche-bank",
    kind: "bank",
    name: "Deutsche Bank AG",
    shortName: "Deutsche Bank",
    city: "Frankfurt am Main",
    telefon: "069 910-10000",
    website: "https://www.deutsche-bank.de",
    // Keine publizierte Anfrage-Adresse — Online-Terminvereinbarung.
    contactUrl: "https://www.deutsche-bank.de/opra4/pfb/advisor-appointments",
    finanzierungsInfo: {
      kapitalanlage: "ja",
      kapitalanlageHinweis:
        "Vollfinanzierung aus steuerlichen Gründen explizit thematisiert; Polster für Instandhaltung/Mietausfall erwartet.",
      ekKapitalanlage:
        "Empfohlen 20% + Nebenkosten; bis 110% Finanzierung mit +0,35% Zinsaufschlag (Drittquelle).",
      maxBeleihung: "100% Kaufpreis, bis 110% gegen Zinsaufschlag (Drittquelle)",
      zinsbindungen: "Bis 30 Jahre",
      selbststaendige: "Ja — individuelle Finanzierungskonzepte (Drittquelle)",
      besonderheiten: [
        "Kein endfälliges Darlehen gelistet — Tilgungsaussetzung über „Wohndarlehen“ mit Bausparvertrag (Drittquelle).",
        "Mindestdarlehen ca. 25.000 € (Drittquelle).",
      ],
    },
  },
  {
    id: "postbank",
    kind: "bank",
    name: "Postbank — eine Niederlassung der Deutsche Bank AG",
    shortName: "Postbank",
    city: "Bonn",
    email: "direkt@postbank.de",
    telefon: "0228 5500 5543",
    website: "https://www.postbank.de",
    contactUrl:
      "https://baufinanzierung.postbank.de/pb-immobilienfinanzierung/leadForm/purchase",
    finanzierungsInfo: {
      kapitalanlage: "unklar",
      kapitalanlageHinweis:
        "Produktseiten ohne Aussage zu vermieteten Objekten; die Makler-Tochter Postbank Immobilien vermittelt aber aktiv Anlageobjekte inkl. Mikroapartments.",
      ekKapitalanlage:
        "Nicht Kapitalanlage-spezifisch publiziert (allgemein 20–30% empfohlen); Zinsstaffel +0,11% ab 70%, +0,12% ab 80% Beleihung (Drittquelle).",
      zinsbindungen: "5–20 Jahre (Drittquelle)",
      selbststaendige:
        "Laut Drittquelle nicht bedient — verlangt wird ein unbefristetes Arbeitsverhältnis (≥6 Monate)",
      besonderheiten: [
        "Mindestdarlehen ca. 50.000 €, max. 5 Mio. € (Drittquelle).",
      ],
    },
  },
  {
    id: "bbbank",
    kind: "bank",
    name: "BBBank eG",
    shortName: "BBBank",
    city: "Karlsruhe",
    email: "info@bbbank.de",
    telefon: "0721 141-0",
    website: "https://www.bbbank.de",
    contactUrl:
      "https://www.bbbank.de/serviceauftraege/kontakt-baufinanzierungsanfrage.html",
    conditions: {
      zinsAb: 3.79, // 10J eff., Beispiel bei 60% Beleihung — indikativ 08/2026
    },
    finanzierungsInfo: {
      kapitalanlage: "unklar",
      kapitalanlageHinweis:
        "Offiziell weder angeboten noch ausgeschlossen; Drittquellen widersprechen sich (vermietete Einheiten ja vs. nein) — unbedingt vorab telefonisch klären.",
      ekKapitalanlage:
        "Vollfinanzierung (100%) möglich — für Beamte ohne Aufschlag, sonst +0,40% (Drittquelle).",
      maxBeleihung: "Vollfinanzierung des Kaufpreises möglich (Nebenkosten aus EK)",
      bereitstellungszinsfrei: "3 Monate",
      zinsbindungen: "5–20 Jahre (Drittquelle)",
      selbststaendige: "Laut Drittquelle nicht finanziert",
      besonderheiten: [
        "Auch endfällige Darlehen im Angebot (Drittquelle).",
        "Gebäudeversicherung Pflicht; Genossenschaftsanteil 5 €; 0,10% Zinsrabatt für Mitglieder.",
        "Mindestdarlehen ca. 50.000 € (Drittquelle).",
      ],
    },
  },
  {
    id: "brandenburger-bank",
    kind: "bank",
    name: "Brandenburger Bank Volksbank-Raiffeisenbank eG",
    shortName: "Brandenburger Bank",
    city: "Brandenburg an der Havel",
    email: "info@brandenburgerbank.de",
    telefon: "03381 357-0",
    website: "https://www.brandenburgerbank.de",
    contactUrl:
      "https://www.brandenburgerbank.de/service/online-services/online-terminvereinbarung.html",
    finanzierungsInfo: {
      kapitalanlage: "unklar",
      kapitalanlageHinweis:
        "Beratung ausdrücklich auch zu Mietwohnungen/Anlageobjekten; größere Mietobjekte über den Firmenkunden-Immobilienkredit (Ertragswertverfahren) — harte Kriterien nur im Gespräch.",
      region: "Brandenburg a. d. Havel, westliches Havelland, Potsdam-Mittelmark",
      besonderheiten: [
        "Publiziert praktisch keine harten Kriterien — alles über persönliche Beratung.",
        "Kooperation mit Schwäbisch Hall und KfW.",
      ],
    },
  },
  {
    id: "targobank",
    kind: "bank",
    name: "TARGOBANK AG",
    shortName: "Targobank",
    city: "Düsseldorf",
    email: "kontakt@targobank.de",
    telefon: "0211 900 20 940",
    website: "https://www.targobank.de",
    contactUrl: "https://www.targobank.de/de/baufinanzierung/index.html",
    finanzierungsInfo: {
      kapitalanlage: "ja",
      kapitalanlageHinweis: "Kapitalanlage explizit möglich.",
      ekKapitalanlage: "EK-Empfehlung ~20% des Kaufpreises.",
      maxBeleihung: "100%, in Einzelfällen bis 110%",
      bereitstellungszinsfrei: "12 Monate (OLB, Drittquelle)",
      zinsbindungen: "Bis 20 Jahre (OLB bis 30, Drittquelle)",
      selbststaendige: "Ja, ohne Zinsaufschlag (OLB, Drittquelle)",
      besonderheiten: [
        "Auch ganze Mehrfamilienhäuser explizit finanzierbar.",
        "Vertragspartner ist seit 07/2026 exklusiv die OLB (Abwicklung via Europace).",
        "Mindestdarlehen ca. 25.000 € (OLB, Drittquelle).",
      ],
    },
  },
  {
    id: "1822direkt",
    kind: "bank",
    name: "1822direkt (Frankfurter Sparkasse)",
    shortName: "1822direkt",
    city: "Frankfurt am Main",
    email: "info@1822direkt.de",
    telefon: "069 505093-0",
    website: "https://www.1822direkt.de",
    contactUrl: "https://www.1822direkt.de/baufinanzierung/beratung",
    conditions: {
      zinsAb: 3.81, // "TOP-Zins ab" (Sollzins) — indikativ 08/2026
    },
    finanzierungsInfo: {
      kapitalanlage: "ja",
      kapitalanlageHinweis: "Zinsbindung ≥10 Jahre für Kapitalanleger empfohlen.",
      ekKapitalanlage:
        "Empfohlen nur 10–15% des Kaufpreises, „über 20% meist nicht erforderlich“; keine 110%-Finanzierung (Drittquelle).",
      maxBeleihung:
        "90–100% Beleihungsauslauf (Drittquellen widersprüchlich; +0,19% Aufschlag bei 90%)",
      bereitstellungszinsfrei: "12 Monate (Drittquelle)",
      selbststaendige:
        "Nicht im Eigenbuch — werden an Partnerbanken vermittelt (Drittquelle)",
      besonderheiten: [
        "Eigenprodukt der Frankfurter Sparkasse + Vermittlung von >400 Partnern.",
        "Darlehensrahmen ca. 50.000–400.000 € im Eigenprodukt (Drittquelle); Mindesttilgung 2%.",
        "Auslandsimmobilien nicht als Sicherheit akzeptiert.",
      ],
    },
  },
];

const BANK_BY_ID: Record<string, Bank> = Object.fromEntries(
  BANKS.map((b) => [b.id, b])
);

export function getBank(id: string): Bank | undefined {
  return BANK_BY_ID[id];
}

export function isValidBankId(id: string): boolean {
  return id in BANK_BY_ID;
}
