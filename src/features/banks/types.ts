import type { PortfolioProperty } from "@/features/portfolio/calculations";
import type { Stammdaten, Haushalt, Strategie } from "@/features/profile/types";

// The applicant's profile, embedded so the previously-blank personal / income /
// strategy fields on the form get filled. The image is embedded as a data URL so
// the headless renderer needs no storage auth.
export type SelbstauskunftProfile = {
  stammdaten: Stammdaten;
  haushalt: Haushalt;
  strategie: Strategie;
  imageDataUrl?: string;
};

// Handoff payload for a bank Selbstauskunft. Built by the API route, stored under
// an unguessable token in the generic `report_jobs.payload` (jsonb), and read back
// by the headless print page. Derived figures (Restschuld, monthly rate, current
// value) are NOT stored — the document component recomputes them from `inputs`
// with the same pure calculation helpers the rest of the app uses.
export type SelbstauskunftPayload = {
  generatedAt: string;
  locale: string;
  bankId: string;
  /** Applicant name for the form header (never the email). */
  investorName: string;
  /** Full portfolio; the Zusatzblatt section scales to this list. */
  properties: PortfolioProperty[];
  /** Applicant profile — fills the personal / income / strategy sections. */
  profile?: SelbstauskunftProfile;
};
