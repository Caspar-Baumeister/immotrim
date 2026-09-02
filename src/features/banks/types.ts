import type { PortfolioProperty } from "@/features/portfolio/calculations";
import type { Stammdaten, Haushalt } from "@/features/profile/types";
import type { ObjektDaten } from "@/features/objekte/types";

// The applicant's profile, embedded so the previously-blank personal / income
// fields on the form get filled. The investor story (Strategie, Über mich,
// Portrait) deliberately is NOT part of the Selbstauskunft — it lives in the
// Investorenbroschüre, so the bank never reads the same content twice.
export type SelbstauskunftProfile = {
  stammdaten: Stammdaten;
  haushalt: Haushalt;
};

// The object behind the request, serialized into the payload. When present it
// replaces the portfolio's first property as the Finanzierungsobjekt.
export type SelbstauskunftObjekt = {
  data: ObjektDaten;
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
  /** The Objekt of the request — fills the Finanzierungsobjekt page. */
  objekt?: SelbstauskunftObjekt;
};
