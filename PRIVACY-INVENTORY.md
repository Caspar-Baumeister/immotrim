# Privacy & Storage Inventory

Audit of every client-side storage item and every external domain the Immotrim
web app touches, plus the consent mechanism. Generated as part of the
privacy/cookie review. Items marked **⚠ verify** depend on provider contracts or
runtime configuration and must be confirmed manually — they are not invented.

## 1. Cookies

| Name | Provider / domain | Purpose | Duration | Technically necessary? |
|------|-------------------|---------|----------|------------------------|
| `sb-<project-ref>-auth-token` (may be chunked, e.g. `.0`, `.1`) | Supabase (first-party, set via `@supabase/ssr`) | Stores the authenticated session (login) | Session / refresh-token lifetime — **⚠ verify** against Supabase auth config | **Yes** — auth/session |
| `NEXT_LOCALE` | next-intl (first-party) | Remembers the chosen UI language (de/en) | next-intl default ≈ 1 year — **⚠ verify** | Functional (necessary for correct localization) |

No tracking, advertising, or third-party cookies are set. Vercel Web Analytics
(see §3) is **cookieless**.

## 2. Local Storage / Session Storage

| Name | Type | Provider | Purpose | Duration | Necessary? |
|------|------|----------|---------|----------|------------|
| `theme` | localStorage | next-themes (first-party) | Light/dark theme preference | Until cleared by user | Functional |
| `immotrim_wishlist_assumptions` | localStorage | App (zustand persist, first-party) — `src/features/wishlist/global-assumptions-store.ts` | Saves the user's own default calculation assumptions for the wishlist/analysis feature | Until cleared by user | Functional (feature state, no third-party transfer) |
| `immotrim_youtube_consent` | localStorage | App (first-party) — `src/components/marketing/YouTubeEmbed.tsx` | Stores **only** the user's consent (`"granted"`) to auto-load YouTube videos | Until revoked via Privacy Settings or cleared | Consent record (necessary to honor the choice) |

**Session Storage:** none used by the application.

## 3. External domains / third-party resources

| Domain / service | Where | Loaded in browser? | Consent required? | Status |
|------------------|-------|--------------------|-------------------|--------|
| `youtube-nocookie.com` / `youtube.com` (Google) | Landing page demo video | Only **after explicit consent** (two-click) | **Yes** | Gated — see §4 |
| Google Fonts: Geist, Geist Mono, Space Grotesk | `src/app/[locale]/layout.tsx` via `next/font/google` | **No** — self-hosted at build time, served from our own origin | No (no runtime Google request) | Essential |
| Vercel Web Analytics (`@vercel/analytics`) | `layout.tsx`, **production only** | Yes (first-party-proxied script at `/_vercel/insights/*`) | Cookieless / anonymized → treated as legitimate interest, no banner — **⚠ verify legal posture** | Kept, documented |
| Supabase (`NEXT_PUBLIC_SUPABASE_URL`) | Auth / DB / storage | Yes | No (strictly necessary) | Essential |
| Stripe | `src/lib/stripe.ts`, billing actions | **No** — server-side only; payment via Stripe-hosted Checkout/Portal redirect | No client-side `stripe.js` loaded | Essential |
| Google Gemini API (`@google/genai`) | `src/app/api/extract/*`, server | **No** — server-side document extraction only | No browser connection | Essential |

Non-loaded references (links/placeholder strings only, no resource fetched):
`ec.europa.eu` (ODR link in Impressum), `immobilienscout24.de` (example URL text).

## 4. YouTube two-click consent solution

Implemented in `src/components/marketing/YouTubeEmbed.tsx`:

1. On first load, **nothing** from Google/YouTube is requested — no iframe, no
   script, no thumbnail. A locally hosted poster (`public/video-poster.svg`) is
   shown with a play button and the required notice.
2. The notice links to the Privacy Policy and offers two actions:
   **"Load YouTube video"** and **"Open on YouTube"** (a plain link; fetches
   nothing until clicked).
3. The iframe is inserted only after the user clicks **Load YouTube video**, and
   only via `youtube-nocookie.com` (privacy-enhanced mode).
4. An optional checkbox stores consent in `immotrim_youtube_consent` so future
   visits auto-load.
5. Consent is revocable any time on `/[locale]/privacy-settings`, linked from the
   footer on every page.

Because YouTube is the only non-essential cross-origin embed and all other
technologies are technically necessary (or cookieless analytics), **no general
cookie banner is used** — the two-click solution covers the single consent case.

## Items to verify manually

- Exact lifetimes of the Supabase auth cookie and `NEXT_LOCALE`.
- Provider legal names/addresses, Art. 28 DPAs, and third-country transfer
  safeguards (SCCs) named in the Privacy Policy.
- Legal posture for running Vercel Web Analytics without consent in the target
  jurisdiction.
