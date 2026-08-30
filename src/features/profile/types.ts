// ─────────────────────────────────────────────────────────────────────────────
// PROFILE DOMAIN TYPES
//
// The per-user "Bank-Ready" profile, stored across three jsonb columns on
// public.profiles. The field catalog mirrors the blank personal/income sections
// of the MBS Selbstauskunft (see MbsSelbstauskunftDocument.tsx) so the generated
// form can be filled straight from this data.
//
// Every field is optional — completeness (src/features/profile/completeness.ts)
// decides how "full" each section is. All amounts are EUR, monthly unless the
// field name says otherwise.
// ─────────────────────────────────────────────────────────────────────────────

export type Anrede = "herr" | "frau";
export type Familienstand = "ledig" | "verheiratet" | "geschieden" | "verwitwet";
export type Beschaeftigung =
  | "angestellter"
  | "beamter"
  | "selbstaendiger"
  | "rentner";

/** Personal master data — the applicant's identity and employment. */
export type Stammdaten = {
  anrede?: Anrede;
  vorname?: string;
  nachname?: string;
  geburtsdatum?: string; // "YYYY-MM-DD"
  geburtsort?: string;
  telefon?: string;
  email?: string;
  strasse?: string; // Straße, Hausnummer
  plzOrt?: string;
  wohnhaftSeit?: string; // "YYYY-MM"
  familienstand?: Familienstand;
  staatsangehoerigkeit?: string;
  steuerId?: string;
  beschaeftigung?: Beschaeftigung;
  arbeitgeber?: string;
  beruf?: string;
  beschaeftigtSeit?: string; // "YYYY-MM"
  anzahlKinder?: number;
  // Kontoverbindung
  kontoinhaber?: string;
  kreditinstitut?: string;
  iban?: string;
  bic?: string;
};

/**
 * Household budget. Income minus expenses gives the monthly savings rate
 * (Sparrate); assets and liabilities feed the financing-volume estimate.
 */
export type Haushalt = {
  // Einnahmen (monatlich)
  nettoeinkommen?: number; // Einkommen Netto (monatlich)
  anzahlGehaelter?: number; // Anzahl der Gehälter im Jahr (default 12)
  kindergeld?: number; // Kindergeld monatlich (0 = bezieht keins)
  weitereEinkuenfte?: number; // sonstige Einkünfte monatlich (ohne Immobilien)
  // Ausgaben (monatlich)
  mietausgaben?: number; // Mietausgaben (monatlich) — eigene Warmmiete
  lebenshaltung?: number; // Lebenshaltungskosten
  krankenversicherung?: number; // Private Krankenversicherung (monatlich)
  versicherungen?: number; // Lebens-/Rentenversicherung + sonstige (monatlich)
  ratenkredite?: number; // Ratenkredit(e) Rate mtl.
  sonstigeAusgaben?: number;
  // Vermögen
  bankSparguthaben?: number;
  wertpapiere?: number;
  sonstigesVermoegen?: number;
  /**
   * Wie viel der liquiden Mittel für den nächsten Kauf eingesetzt werden soll.
   * Der Rest (Bank/Spar + Wertpapiere − dieser Betrag) ist die Liquiditätsreserve
   * nach Kauf — für Banken aussagekräftiger als der reine Vermögensbestand.
   */
  ekVerfuegbar?: number;
  // Verbindlichkeiten (Gesamthöhe, ohne Immobiliendarlehen)
  sonstigeVerbindlichkeiten?: number;
};

/** Investor strategy + about-me, fed into the Selbstauskunft cover. */
export type Strategie = {
  strategieText?: string; // Immobilien-/Investmentstrategie
  ueberMich?: string; // Über mich
  /** Storage path in the property-documents bucket (portrait / logo). */
  imagePath?: string;
};

/** A full profile row. */
export type Profile = {
  user_id: string;
  stammdaten: Stammdaten;
  haushalt: Haushalt;
  strategie: Strategie;
  created_at: string;
  updated_at: string;
};

export type ProfileSection = "stammdaten" | "haushalt" | "strategie";

export const EMPTY_STAMMDATEN: Stammdaten = {};
export const EMPTY_HAUSHALT: Haushalt = {};
export const EMPTY_STRATEGIE: Strategie = {};
