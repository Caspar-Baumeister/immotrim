import "server-only";
import type { createServerSupabase } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>;

// Monthly cap on AI portfolio-chat turns per user. One user message = one unit
// (including any internal tool/document calls it triggers). Env-overridable so
// it can be tuned without a deploy. Mirrors ai-usage.ts.
export const MONTHLY_CHAT_LIMIT = Number(process.env.AI_CHAT_MONTHLY_LIMIT ?? 300);

function currentPeriod(): string {
  // UTC "YYYY-MM" — must match consume_ai_chat's server-side period.
  return new Date().toISOString().slice(0, 7);
}

// Reads the caller's used chat count for the current month (0 if no row yet).
export async function getChatUsage(
  sb: ServerSupabase,
  userId: string,
): Promise<{ used: number; limit: number }> {
  const { data } = await sb
    .from("ai_chat_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("period", currentPeriod())
    .maybeSingle();
  return { used: data?.count ?? 0, limit: MONTHLY_CHAT_LIMIT };
}

// Atomically increments the caller's current-month chat counter (capped at the
// limit). Call only after a successful turn so failures don't burn a credit.
// Best-effort: a tracking failure must never fail an already-successful turn.
export async function consumeChatUsage(sb: ServerSupabase): Promise<void> {
  const { error } = await sb.rpc("consume_ai_chat", { p_limit: MONTHLY_CHAT_LIMIT });
  if (error) console.error("consume_ai_chat failed:", error);
}
