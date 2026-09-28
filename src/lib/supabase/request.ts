import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createServerSupabase } from "./server";
import type { Database } from "./types";

// A user-scoped Supabase client for API routes that are called either by the web
// app (cookie session) or by the iPhone app (Authorization: Bearer <jwt>). Both
// flavours use the ANON key, so RLS applies exactly as for that user.
export type RequestSupabase = SupabaseClient<Database>;

function bearerTokenFrom(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token ? token : null;
}

// Anon-key client that forwards the caller's JWT on every PostgREST/storage
// request. No session persistence: the token lives only for this request.
export function createBearerSupabase(token: string): RequestSupabase {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

// Bearer header present → token-scoped client; otherwise the cookie-based SSR client.
export async function createRequestSupabase(request: Request): Promise<RequestSupabase> {
  const token = bearerTokenFrom(request);
  if (token) return createBearerSupabase(token);
  return createServerSupabase();
}

// Resolves the caller: the client to use for RLS-scoped queries plus the auth
// user (null when the token/cookie is missing or invalid). For a Bearer token
// the user is verified server-side via getUser(token).
export async function getRequestUser(
  request: Request,
): Promise<{ sb: RequestSupabase; user: User | null }> {
  const token = bearerTokenFrom(request);
  if (token) {
    const sb = createBearerSupabase(token);
    const {
      data: { user },
    } = await sb.auth.getUser(token);
    return { sb, user };
  }
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return { sb, user };
}
