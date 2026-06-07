import "server-only";

// Resolves the public base URL for building absolute links (Stripe checkout/portal
// redirects, Supabase auth email callbacks). Order of preference:
//   1. NEXT_PUBLIC_APP_URL — explicit override (e.g. https://immotrim.com)
//   2. VERCEL_PROJECT_PRODUCTION_URL — your production domain, set automatically by
//      Vercel once the domain is assigned (e.g. immotrim.com)
//   3. VERCEL_URL — the current deployment's URL (preview deploys)
//   4. http://localhost:3000 — local dev
//
// This means redirects/email links resolve to the real domain on Vercel even if
// NEXT_PUBLIC_APP_URL is never set, instead of breaking to localhost.
export function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;

  const deployment = process.env.VERCEL_URL;
  if (deployment) return `https://${deployment}`;

  return "http://localhost:3000";
}
