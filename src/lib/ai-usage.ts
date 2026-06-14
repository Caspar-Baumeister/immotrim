import "server-only";
import type { createServerSupabase } from "./supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>;

// Monthly cap on AI document extractions per user — the only usage restriction.
// Env-overridable so it can be tuned without a deploy.
export const MONTHLY_LIMIT = Number(process.env.AI_EXTRACTION_MONTHLY_LIMIT ?? 500);

function currentPeriod(): string {
  // UTC "YYYY-MM" — must match consume_ai_extraction's server-side period.
  return new Date().toISOString().slice(0, 7);
}

// Reads the caller's used count for the current month (0 if no row yet).
export async function getMonthlyUsage(
  sb: ServerSupabase,
  userId: string,
): Promise<{ used: number; limit: number }> {
  const { data } = await sb
    .from("ai_extraction_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("period", currentPeriod())
    .maybeSingle();
  return { used: data?.count ?? 0, limit: MONTHLY_LIMIT };
}

// Atomically increments the caller's current-month counter (capped at the limit).
// Call only after a successful extraction so failures don't burn a credit.
// Best-effort: a tracking failure must never fail an already-successful extraction
// (e.g. during the window between a prod deploy and the DB migration being applied).
export async function consumeMonthlyUsage(sb: ServerSupabase): Promise<void> {
  const { error } = await sb.rpc("consume_ai_extraction", { p_limit: MONTHLY_LIMIT });
  if (error) console.error("consume_ai_extraction failed:", error);
}
