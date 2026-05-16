import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let _admin: ReturnType<typeof createClient<Database>> | null = null;

// Service-role client. NEVER expose to the browser. Used by the Stripe webhook
// to upsert subscription rows on behalf of users, bypassing RLS.
export function getSupabaseAdmin() {
  if (!_admin) {
    _admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return _admin;
}
