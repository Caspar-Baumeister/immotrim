"use client";

// Outreach tracking per (Konzept, Bank): one upserted row in
// concept_bank_requests holding the status of that inquiry.

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase";

type Row = Database["public"]["Tables"]["concept_bank_requests"]["Row"];

export const ANFRAGE_STATUSES = [
  "entwurf",
  "angefragt",
  "in_gespraech",
  "zusage",
  "absage",
] as const;

export type AnfrageStatus = (typeof ANFRAGE_STATUSES)[number];

export const ANFRAGE_STATUS_LABELS: Record<AnfrageStatus, string> = {
  entwurf: "Entwurf",
  angefragt: "Angefragt",
  in_gespraech: "Im Gespräch",
  zusage: "Zusage",
  absage: "Absage",
};

export type BankRequest = {
  conceptId: string;
  bankId: string;
  status: AnfrageStatus;
  sentAt: string | null;
  notes: string | null;
};

function fromRow(row: Row): BankRequest {
  const status = (ANFRAGE_STATUSES as readonly string[]).includes(row.status)
    ? (row.status as AnfrageStatus)
    : "entwurf";
  return {
    conceptId: row.concept_id,
    bankId: row.bank_id,
    status,
    sentAt: row.sent_at,
    notes: row.notes,
  };
}

export async function upsertRequestStatus(
  conceptId: string,
  bankId: string,
  status: AnfrageStatus,
  opts?: { sentAt?: string | null; notes?: string | null },
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("concept_bank_requests").upsert(
    {
      user_id: user.id,
      concept_id: conceptId,
      bank_id: bankId,
      status,
      ...(opts?.sentAt !== undefined ? { sent_at: opts.sentAt } : {}),
      ...(opts?.notes !== undefined ? { notes: opts.notes } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "concept_id,bank_id" },
  );
  if (error) throw error;
}

export async function listRequestsForConcept(conceptId: string): Promise<BankRequest[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("concept_bank_requests")
    .select("*")
    .eq("concept_id", conceptId);
  if (error || !data) return [];
  return (data as Row[]).map(fromRow);
}

/** All requests of the user, for status chips on concept cards. */
export async function listAllRequests(): Promise<BankRequest[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("concept_bank_requests").select("*");
  if (error || !data) return [];
  return (data as Row[]).map(fromRow);
}
