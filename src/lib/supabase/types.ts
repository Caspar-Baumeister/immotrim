export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Domain types ─────────────────────────────────────────────────────────────

export type Nebenkosten = {
  grunderwerbsteuerPct: number; // 3.5–6.5% by Bundesland, default 6
  notarGrundbuchPct: number;    // ~1.5%
  maklerprovisionPct: number;   // ~3.57%, 0 if provisionsfrei
  sonstigePct: number;          // misc, default 0
};

export type TaxInputs = {
  gebaeudeanteilPct: number;    // building share % of purchase price (only building is depreciable)
  bemessungsgrundlage: number;  // assessment basis for AfA (usually = kaufpreis, can include Nebenkosten)
  afaPct: number;               // annual depreciation rate % (2% standard, 3% new builds ≥2023, 2.5% pre-1925)
  steuersatz: number;           // personal marginal income tax rate % (Grenzsteuersatz)
};

export type PropertyInputs = {
  // === Purchase ===
  kaufpreis: number;
  nebenkosten: Nebenkosten;
  eigenanteil: number;           // equity in €

  // === Mortgage (Annuitätendarlehen) ===
  zins: number;                  // annual interest rate %
  tilgung: number;               // initial annual repayment rate % — drives full payoff
  zinsbindung: number;           // Zinsbindungsdauer years — chart marker only
  loanStartDate: string;         // "YYYY-MM"

  // === Rent ===
  kaltmiete: number;             // monthly cold rent in €
  nichtUmlagefaehig: number;     // non-allocable monthly costs in €
  leerstand: number;             // vacancy rate %

  // === Reserves ===
  ruecklagen: number;            // monthly reserves in €

  // === Growth (optional per-property forecast; calculations fall back to 0%) ===
  mietentwicklung?: number;      // rent growth % p.a.
  wertentwicklung?: number;      // appreciation % p.a.

  // === Tax (optional — omitting hides tax-related display) ===
  tax?: TaxInputs;
};

export type Property = {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  inputs: PropertyInputs;
  created_at: string;
  updated_at: string;
};

export type PropertyDocument = {
  id: string;
  user_id: string;
  property_id: string | null;
  draft_id: string | null;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const DEFAULT_INPUTS: PropertyInputs = {
  kaufpreis: 400_000,
  nebenkosten: {
    grunderwerbsteuerPct: 6,
    notarGrundbuchPct: 1.5,
    maklerprovisionPct: 3.57,
    sonstigePct: 0,
  },
  eigenanteil: 100_000,
  zins: 3.5,
  tilgung: 2.0,
  zinsbindung: 10,
  loanStartDate: getCurrentMonth(),
  kaltmiete: 1_400,
  nichtUmlagefaehig: 280,
  leerstand: 3,
  ruecklagen: 333,
  mietentwicklung: undefined,
  wertentwicklung: undefined,
  tax: undefined,
};

// ─── Supabase Database type ──────────────────────────────────────────────────

type WishlistRowShape = {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  expose_url: string | null;
  lage: string | null;
  kaufpreis: number | null;
  wohnflaeche: number | null;
  zimmer: number | null;
  baujahr: number | null;
  kaltmiete: number | null; // deprecated; kept for backfill only
  ist_miete: number | null;
  soll_miete: number | null;
  eigenanteil: number | null;
  nebenkosten_pct: number;
  extras: Json;
  details: Json;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type DocumentRowShape = {
  id: string;
  user_id: string;
  property_id: string | null;
  draft_id: string | null;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

type SubscriptionRowShape = {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  price_id: string | null;
  plan_interval: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          address: string | null;
          inputs: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          address?: string | null;
          inputs: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          address?: string | null;
          inputs?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      wishlist_properties: {
        Row: WishlistRowShape;
        Insert: Omit<WishlistRowShape, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<WishlistRowShape, "id" | "user_id" | "created_at">> & {
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: DocumentRowShape;
        Insert: Omit<DocumentRowShape, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DocumentRowShape, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      subscriptions: {
        Row: SubscriptionRowShape;
        // user_id and status are required; everything else has defaults or is nullable.
        Insert: Partial<Omit<SubscriptionRowShape, "user_id" | "status">> & {
          user_id: string;
          status: string;
        };
        Update: Partial<Omit<SubscriptionRowShape, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      ai_extraction_usage: {
        // Per-user monthly AI extraction counter. Mutated only via the
        // consume_ai_extraction RPC; users can read their own row.
        Row: {
          user_id: string;
          period: string;
          count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_ai_extraction: {
        Args: { p_limit: number };
        Returns: { allowed: boolean; used: number }[];
      };
    };
  };
};
