// ─────────────────────────────────────────────────────────────────────────────
// PROFILE FIELD REQUIREMENTS
//
// Drives the per-section completion bar ("wie viel ist ausgefüllt"). Each field
// carries a weight; completion = Σ weight(filled) / Σ weight(all). Kept as flat,
// readable lists so a financing advisor can tune importance without touching the
// completion maths in completeness.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { Stammdaten, Haushalt, Strategie } from "./types";

export type FieldReq<T> = {
  key: keyof T;
  label: string;
  /** Relative importance for the completion bar (default 1). */
  weight?: number;
};

export const STAMMDATEN_FIELDS: FieldReq<Stammdaten>[] = [
  { key: "anrede", label: "Anrede", weight: 0.5 },
  { key: "vorname", label: "Vorname" },
  { key: "nachname", label: "Nachname" },
  { key: "geburtsdatum", label: "Geburtsdatum" },
  { key: "telefon", label: "Telefon" },
  { key: "email", label: "E-Mail" },
  { key: "strasse", label: "Straße, Hausnummer" },
  { key: "plzOrt", label: "PLZ, Ort" },
  { key: "familienstand", label: "Familienstand" },
  { key: "staatsangehoerigkeit", label: "Staatsangehörigkeit", weight: 0.5 },
  { key: "steuerId", label: "Steuer-ID", weight: 0.5 },
  { key: "beschaeftigung", label: "Art der Beschäftigung" },
  { key: "arbeitgeber", label: "Arbeitgeber" },
  { key: "beruf", label: "Beruf", weight: 0.5 },
  { key: "beschaeftigtSeit", label: "Beschäftigt seit", weight: 0.5 },
];

export const HAUSHALT_FIELDS: FieldReq<Haushalt>[] = [
  { key: "nettoeinkommen", label: "Nettoeinkommen (monatlich)", weight: 2 },
  { key: "lebenshaltung", label: "Lebenshaltungskosten (monatlich)" },
  { key: "mietausgaben", label: "Eigene Mietausgaben (monatlich)" },
  { key: "krankenversicherung", label: "Krankenversicherung (monatlich)", weight: 0.5 },
  { key: "versicherungen", label: "Weitere Versicherungen (monatlich)", weight: 0.5 },
  { key: "ratenkredite", label: "Ratenkredite (Rate mtl.)", weight: 0.5 },
  { key: "bankSparguthaben", label: "Bank- und Sparguthaben" },
  { key: "wertpapiere", label: "Wertpapiere / Aktien", weight: 0.5 },
  { key: "sonstigesVermoegen", label: "Sonstiges Vermögen", weight: 0.5 },
  { key: "sonstigeVerbindlichkeiten", label: "Sonstige Verbindlichkeiten", weight: 0.5 },
];

export const STRATEGIE_FIELDS: FieldReq<Strategie>[] = [
  { key: "strategieText", label: "Investmentstrategie", weight: 2 },
  { key: "ueberMich", label: "Über mich" },
  { key: "imagePath", label: "Profilbild" },
];

/** A value counts as "filled": non-empty string, or any finite number (incl. 0). */
export function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return true;
}
