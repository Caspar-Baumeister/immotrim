# Immotrim — Backend, Auth, DB & Billing Architecture

> Read this first when something in the **backend, database, Supabase auth, Google login,
> Stripe billing, or Vercel deployment** is misbehaving. It documents how the pieces fit
> together and the non-obvious gotchas that have actually bitten us. Companion docs:
> [STAGING.md](STAGING.md) (deploy flow) and [LAUNCH.md](LAUNCH.md) (launch runbook).

---

## 1. Stack & topology

- **App:** Next.js (App Router, `src/app/[locale]/…`, i18n via `next-intl`, locales `en`/`de`).
- **Auth + DB:** Supabase (email/password + Google OAuth, Postgres with RLS).
- **Billing:** Stripe (subscription mode, one plan billed monthly or yearly).
- **Hosting:** Vercel — **ONE project** (`immotrim-ypn7`), two environments.

### Environments — one Vercel project, two Supabase projects

| Env | Git branch | Domain | Stripe | Supabase |
|-----|-----------|--------|--------|----------|
| **Production** | `main` | `immotrim.com` | **live** keys + live price IDs | **prod** Supabase project |
| **Staging/Preview** | `staging` | `dev.immotrim.com` | **test** keys + test price IDs | **separate staging** Supabase project |
| **Local** | — (`.env.local`) | `localhost:3000` | test keys | (points at one project — verify which before running destructive SQL) |

Selection is by **per-Vercel-scope env vars** (set per Production / Preview). The two
Supabase projects are fully isolated — staging payments/users never touch prod data.

> ⚠️ Because prod and staging share **one** Vercel project, settings that are project-wide
> (like Deployment Protection) need their *scope* checked carefully — see §6.

---

## 2. Environment variables

| Var | Purpose | Notes |
|-----|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | **Must be bare** `https://<ref>.supabase.co` — no trailing slash, no path. A malformed value makes Supabase return `Invalid path specified in request URL`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/server anon key | Must belong to the **same** project as the URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server only) | Used by the Stripe webhook to write subscription rows, bypassing RLS. NEVER expose to the browser. See [admin.ts](src/lib/supabase/admin.ts). |
| `NEXT_PUBLIC_APP_URL` | Public base URL for absolute links | **Mandatory on staging** = `https://dev.immotrim.com`. First preference in [getBaseUrl()](src/lib/url.ts). A `www.` here caused a TLS cert error on the Stripe redirect (see §7). |
| `STRIPE_SECRET_KEY` | Canonical Stripe secret (per scope) | Preferred. Falls back to `STRIPE_SECRET_KEY_TEST` / `_LIVE` keyed off `VERCEL_ENV` (NOT `NODE_ENV` — Vercel sets that to `production` on every deploy incl. previews). See [stripe.ts](src/lib/stripe.ts). |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` | Price IDs | Must match the key's mode (test vs live) or `prices.retrieve` throws and pricing cards render blank. |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`) | Per scope; must match the signing secret of *that* environment's Stripe webhook endpoint. |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | AI document analysis + mobile portfolio chat | — |
| `REVENUECAT_WEBHOOK_SECRET` | Auth header value RevenueCat sends to `/api/revenuecat/webhook` | iPhone app billing, see §9. Route returns 503 while unset. |
| `AI_CHAT_MONTHLY_LIMIT` | Monthly cap on `/api/mobile/chat` calls per user (default 300) | Enforced by the `consume_ai_chat` RPC, see §9. |
| `VERCEL_ENV`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL` | Set automatically by Vercel | Used as `getBaseUrl()` fallbacks. |

`getBaseUrl()` preference order: `NEXT_PUBLIC_APP_URL` → `VERCEL_PROJECT_PRODUCTION_URL`
→ `VERCEL_URL` → `http://localhost:3000`.

---

## 3. Auth flow (Supabase)

Clients: [server.ts](src/lib/supabase/server.ts) (`createServerSupabase`, cookie-based SSR
client) and [admin.ts](src/lib/supabase/admin.ts) (service-role, webhook only).

### Email / password
- Server actions in [auth/actions.ts](src/app/[locale]/auth/actions.ts): `signupAction`, `loginAction`.
- **Signup:** `sb.auth.signUp({ …, emailRedirectTo: <base>/api/auth/callback?next=/<locale>/pricing?plan=… })`.
  If email confirmation is **on** → no session yet → UI shows "check your inbox".
  If **off** → session created → relative `redirect(next)` (stays on current host — this is
  why the post-signup `/pricing` hop never picks up a bad host).
- No Stripe customer is created at signup — only at checkout — so abandoned signups don't
  leave dangling Stripe customers.

### Google OAuth
- `signInWithGoogleAction` → `signInWithOAuth({ provider: "google", redirectTo: <base>/api/auth/callback?next=/<locale>/portfolio })`.
- Server action writes the PKCE verifier cookie, then redirects the browser to Google →
  Supabase → `/api/auth/callback`.

### Callback — [api/auth/callback/route.ts](src/app/api/auth/callback/route.ts)
- Handles both PKCE `code` (`exchangeCodeForSession`) and `token_hash`+`type`
  (`verifyOtp`, for password recovery), then redirects to `next`.
- `next` is sanitized to internal paths only (must start with single `/`) to block open redirects.
- Lives under `/api` so [proxy.ts](src/proxy.ts) skips it.

### Proxy / middleware — [proxy.ts](src/proxy.ts)
- Runs `next-intl` (locale routing) + refreshes the Supabase session cookie every request.
- **Optimistic** auth gate: unauthenticated user hitting `/portfolio|/wishlist|/property|/account`
  → bounced to landing. The **authoritative** gate is the `(app)` layout (§4).

---

## 4. Paywall / entitlement

Two layers:
1. **Optimistic** (proxy): just checks for a session.
2. **Authoritative** — [(app)/layout.tsx](src/app/[locale]/(app)/layout.tsx): requires a
   session **and** an active subscription, else `redirect(/<locale>/pricing)`.

`getActiveSubscription` in [dal.ts](src/lib/dal.ts): entitled =
`status ∈ {active, trialing}` **AND** (`current_period_end` is null OR in the future).
Anything else (incl. `incomplete`, `past_due`, `canceled`) → bounced to `/pricing`.

> The paywall is enforced **in app code**, independent of Vercel Deployment Protection.
> Making a deployment publicly reachable does NOT bypass the paywall.

---

## 5. Stripe billing

### Tables
`subscriptions` (one row per user, `onConflict: user_id`): `user_id`, `stripe_customer_id`,
`stripe_subscription_id`, `status`, `price_id`, `plan_interval`, `current_period_end`,
`cancel_at_period_end`.

### Checkout — [billing/actions.ts](src/app/[locale]/billing/actions.ts)
- `startCheckoutAction`: requires a logged-in user (else → signup), `getOrCreateStripeCustomer`
  (creates a Stripe customer + upserts row with **`status: "incomplete"`** on first run),
  then `checkout.sessions.create` (subscription mode) with
  `success_url = <base>/<locale>/portfolio`, `cancel_url = <base>/<locale>/pricing`,
  `metadata.user_id` on both session and subscription.
- `startPortalAction`: opens the Stripe customer portal.

### Webhook — [api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts)
- Verifies signature with `STRIPE_WEBHOOK_SECRET`; on failure → 400.
- Handles `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`,
  `invoice.payment_failed`. Writes via the **service-role** admin client (bypasses RLS).

### Entitlement state machine (critical mental model)
```
signup → /pricing → Subscribe → Stripe Checkout (pay)
   row created as status="incomplete"        ← NOT entitled yet; gate sends to /pricing
        │
        ▼  Stripe fires webhook → our route → row status="active"
   /portfolio opens                          ← entitlement comes ONLY from the webhook
```
**The webhook is the ONLY thing that flips `incomplete → active`.** If the webhook never
reaches our route, payment succeeds in Stripe but the user is stuck on `/pricing` forever.

---

## 6. Vercel Deployment Protection (the big one)

`dev.immotrim.com` is **team-only**, gated by **Vercel Authentication** (Settings →
Deployment Protection → "Require Log In" = **Standard Protection**).

- **Standard Protection** protects preview deployments (`dev.immotrim.com`) but leaves the
  **production custom domain `immotrim.com` PUBLIC** — exactly what we want. Do NOT switch
  to "All Deployments": that would lock prod behind Vercel login and block all customers.
- Because it's one Vercel project, always confirm this is "Standard Protection" before a
  prod launch.

### Why the team can browse staging but external services get 401
Your browser carries the Vercel SSO cookie (you're logged into the team) → you pass.
Any server with no cookie (Stripe, curl, an outside tester) gets a **401 + Vercel
"Authentication Required" HTML page** instead of the real route. This 401 is from Vercel,
*not* from our code.

### Letting Stripe through: Protection Bypass for Automation
Settings → Deployment Protection → **Protection Bypass for Automation** → Add Secret.
Use the secret two ways:
- **Stripe webhook (staging):** append as a query param to the endpoint URL:
  `https://dev.immotrim.com/api/stripe/webhook?x-vercel-protection-bypass=<SECRET>`
- **Browser access without a Vercel login** (e.g. an outside tester):
  `https://dev.immotrim.com/?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=<SECRET>`
  (sets a cookie; whole site browsable with just the secret).

> **Production webhook needs NO bypass** — `immotrim.com` is public under Standard
> Protection. Keep test-mode and live-mode Stripe webhooks as two separate endpoints
> (`dev.immotrim.com/api/stripe/webhook?…bypass…` vs `immotrim.com/api/stripe/webhook`).

---

## 7. Troubleshooting playbook (symptoms we've actually hit)

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| Login/signup shows **"Invalid path specified in request URL"** | `NEXT_PUBLIC_SUPABASE_URL` malformed (trailing slash / extra path / wrong-project value) on that env scope | Set it to the bare `https://<ref>.supabase.co` for the correct project; redeploy. |
| After Stripe checkout, browser lands on **`www.dev.immotrim.com`** → `NET::ERR_CERT_COMMON_NAME_INVALID` | `NEXT_PUBLIC_APP_URL` (staging) had a `www.` prefix; cert only covers `dev.immotrim.com`. `success_url` is the only absolute URL in the flow, so only it showed the bad host. | Set staging `NEXT_PUBLIC_APP_URL = https://dev.immotrim.com` (no www); redeploy. |
| Paid in Stripe but **always bounced back to `/pricing`** | Subscription row stuck at `incomplete` — the webhook never updated it. | Check Stripe → Webhooks → Event deliveries for non-200s (see next two rows). |
| Webhook deliveries return **401** with body = Vercel "Authentication Required" HTML | Vercel Deployment Protection blocking Stripe (no SSO cookie). | Add Protection Bypass for Automation secret; append `?x-vercel-protection-bypass=<SECRET>` to the webhook URL; **Resend** failed events. |
| Webhook returns **400 "Invalid signature"** | `STRIPE_WEBHOOK_SECRET` on that scope ≠ the endpoint's signing secret, or wrong endpoint. | Copy the endpoint's signing secret into the matching Vercel scope; redeploy. |
| Webhook returns **308** with body `{"redirect":"https://www.immotrim.com/api/stripe/webhook"}` | Endpoint targets the apex `immotrim.com`, which permanently redirects to the canonical `www.immotrim.com`. **Stripe does not follow redirects** → delivery fails, row never updates. | Point the webhook at the non-redirecting canonical host: `https://www.immotrim.com/api/stripe/webhook`; resend. |
| Pricing cards render **blank** | Price IDs don't match the Stripe key mode (test vs live), so `prices.retrieve` throws. | Use test price IDs with test key (staging), live with live (prod). |
| Stripe behaves as wrong mode on a preview deploy | Code keyed mode off `NODE_ENV` instead of `VERCEL_ENV` | Already handled in [stripe.ts](src/lib/stripe.ts) — uses `VERCEL_ENV`. |

### Where to look
- **Stripe** → Developers → Webhooks → your endpoint → **Event deliveries** (status code + response body).
- **Supabase** → Logs → `auth` / `api` (or via MCP `get_logs`). Point any MCP/CLI at the
  **correct** project (staging vs prod are separate).
- **Vercel** → Deployment → Functions logs for `/api/stripe/webhook` (look for the 200).

### Going-live checklist (Stripe on production)
Live mode is **fully separate** from test mode — nothing carries over. Before/after launch:
1. **Live webhook endpoint** exists in **LIVE mode**, URL = `https://www.immotrim.com/api/stripe/webhook`
   (the canonical `www` host — the apex `immotrim.com` 308-redirects and Stripe won't follow it).
   No `?x-vercel-protection-bypass=…` (prod is public).
2. Subscribed to `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`,
   `invoice.payment_failed`.
3. Production Vercel scope: `STRIPE_WEBHOOK_SECRET` = the **live** endpoint's signing secret →
   **redeploy** after setting it.
4. Production `STRIPE_PRICE_MONTHLY`/`_YEARLY` = **live** price IDs at the intended amount.
5. After a real test payment, the live webhook delivery returns **200** and the prod
   `subscriptions` row flips to `active`. If a historical event needs replaying (e.g. endpoint
   created after the payment), use **Resend** on the real event — not "Send test events".

### Verifying a fix end-to-end
1. Subscribe with a Stripe **test card** on staging.
2. Stripe webhook delivery returns **200**.
3. `subscriptions` row for that user → `status = "active"`.
4. `/<locale>/portfolio` opens instead of bouncing to `/pricing`.

---

## 8. Key files

| File | Role |
|------|------|
| [src/lib/url.ts](src/lib/url.ts) | `getBaseUrl()` — base URL resolution |
| [src/lib/stripe.ts](src/lib/stripe.ts) | Stripe client, key/price selection by mode |
| [src/lib/dal.ts](src/lib/dal.ts) | `verifySession`, `getActiveSubscription` (entitlement) |
| [src/lib/supabase/server.ts](src/lib/supabase/server.ts) | SSR Supabase client (cookies) |
| [src/lib/supabase/admin.ts](src/lib/supabase/admin.ts) | service-role client (webhook) |
| [src/proxy.ts](src/proxy.ts) | i18n + session refresh + optimistic auth gate |
| [src/app/[locale]/auth/actions.ts](src/app/[locale]/auth/actions.ts) | signup / login / Google / logout / password reset |
| [src/app/api/auth/callback/route.ts](src/app/api/auth/callback/route.ts) | Supabase auth redirect handler |
| [src/app/[locale]/billing/actions.ts](src/app/[locale]/billing/actions.ts) | checkout + customer portal |
| [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts) | Stripe webhook → subscription row |
| [src/app/[locale]/(app)/layout.tsx](src/app/[locale]/(app)/layout.tsx) | authoritative paywall gate |
| [src/lib/supabase/request.ts](src/lib/supabase/request.ts) | Bearer-or-cookie Supabase client for API routes (`getRequestUser`) |
| [src/lib/entitlement.ts](src/lib/entitlement.ts) | `isEntitled` (mobile routes) |
| [src/app/api/revenuecat/webhook/route.ts](src/app/api/revenuecat/webhook/route.ts) | RevenueCat webhook → subscription row |
| [src/app/api/mobile/*](src/app/api/mobile) | iPhone app routes (chat, extract, report, account delete) |
| [src/lib/extraction/core.ts](src/lib/extraction/core.ts) | Gemini document extraction shared by web + mobile |
| [src/lib/report/render.ts](src/lib/report/render.ts) | PDF report pipeline shared by web + mobile |

---

## 9. Mobile app (iPhone)

The Flutter iPhone app talks to the same Supabase project directly (auth, `properties`,
storage) and to this Next.js deployment for everything that needs a server secret. Nothing
here replaces the web flows; the mobile routes sit next to them.

### Auth: Bearer tokens instead of cookies
- The app sends `Authorization: Bearer <supabase access token>` on every API call.
- [request.ts](src/lib/supabase/request.ts) builds an **anon-key** client with that header
  (`createBearerSupabase`), so RLS applies exactly as for that user, and verifies the user
  with `sb.auth.getUser(token)`. Without a Bearer header it falls back to the cookie client,
  so `getRequestUser(request)` works for web and app alike.
- Entitlement for mobile routes is [entitlement.ts](src/lib/entitlement.ts) `isEntitled`:
  `status ∈ {active, trialing}` AND (`current_period_end` null or in the future). Same rule
  as §4; the trial counts, unlike the web bank report (`hasPaidPlan`).

### Routes (all `runtime = "nodejs"`, JSON errors `{ error: "<code>" }`)

| Route | Purpose | Errors |
|-------|---------|--------|
| `POST /api/mobile/chat` | Portfolio chat (Gemini, function calling). Body `{ messages: [{ role, content }], locale }`, last 20 messages. Returns `{ reply, updates: [{ propertyId, propertyName, field, value }] }`. The model may call `update_property_field`; the row is updated through the user's RLS client (`inputs` jsonb, or the `name`/`address` columns). Max 4 tool rounds. | 401 `unauthorized`, 402 `payment_required`, 429 `limit` (monthly cap `AI_CHAT_MONTHLY_LIMIT`, default 300, via `consume_ai_chat` RPC + table `ai_chat_usage`), 400 `bad_request`, 502 `upstream`, 503 `not_configured` |
| `POST /api/mobile/extract` | Same Gemini extraction as `/api/extract` in mode `property`, Bearer auth + entitlement. Body `{ docs: [{ path, name }] }`. Shares the `ai_extraction_usage` quota. | 401, 402, 429 `limit`, 400, 403 `forbidden`, 404 `not_found`, 413 `too_large`, 502 `upstream`, 503 `busy`/`not_configured` |
| `POST /api/mobile/report` | Bank-facing PDF "Immobilienübersicht" (report variant `portfolio`: cover texts, no profile page, extra `BankKpiPage` with DSCR, Mietdeckung, LTV, Eigenkapitalquote, Ø Zins/Tilgung, Zinsbindungen). Body `{ investorName, propertyIds, includeTax, includeImages }`. Trial allowed. | 401, 402, 400 `bad_request`, 500 `server_error`, 502 `upstream` |
| `POST /api/mobile/account/delete` | App Store account deletion. Removes storage objects under `<uid>/` in `property-documents`, then rows in properties, documents, report_images, profiles, subscriptions, wishlist_properties, concept_objects, portfolio_shares, then `auth.admin.deleteUser`. | 401, 500 `server_error` |

Shared internals: [extraction/core.ts](src/lib/extraction/core.ts) (`extractFromDocs`) and
[report/render.ts](src/lib/report/render.ts) (`renderPortfolioReport`) are used by both the
web routes and the mobile routes. The web routes' behaviour (auth, `hasPaidPlan`, error
messages, file names) is unchanged.

### Billing: RevenueCat webhook
- The app sells the subscription through the App Store via RevenueCat and registers the
  **Supabase user id as the RevenueCat app user id**.
- [api/revenuecat/webhook/route.ts](src/app/api/revenuecat/webhook/route.ts) verifies the
  `Authorization` header against `REVENUECAT_WEBHOOK_SECRET` (raw value or `Bearer <value>`)
  and upserts the `subscriptions` row (`onConflict: user_id`) with the service-role client.
- Columns added by `20260928_subscriptions_source.sql`: `source` (`stripe` default,
  `revenuecat`), `rc_app_user_id`, `rc_product_id`. `plan_interval` is `yearly` when the
  product id ends with `_yearly`, else `monthly`.
- Event mapping: `INITIAL_PURCHASE`, `RENEWAL`, `PRODUCT_CHANGE`, `UNCANCELLATION`,
  `NON_RENEWING_PURCHASE` → `trialing` (period_type `TRIAL`) or `active`, `current_period_end`
  from `expiration_at_ms`, `cancel_at_period_end=false`. `CANCELLATION` → `cancel_at_period_end=true`
  (status unchanged). `EXPIRATION` → `canceled`. `BILLING_ISSUE` → `past_due`. `TEST` and
  anonymous ids (`$RCAnonymousID:`) → 200 no-op.
- **A currently entitled `source='stripe'` row is never touched by RevenueCat events**
  (a lapsed App Store trial must not cancel a paying web customer).
- The entitlement rule stays the same for both sources: `active|trialing` and period end
  null or in the future.

### Migrations
- `20260928_subscriptions_source.sql`: `source`, `rc_app_user_id`, `rc_product_id` on
  `subscriptions` (idempotent; the UNIQUE constraints on the Stripe ids stay, NULLs are
  distinct).
- `20260928_ai_chat_usage.sql`: table `ai_chat_usage` (user_id, period `YYYY-MM`, count) with
  select-own RLS and the security-definer RPC `consume_ai_chat(p_limit int)`, same contract
  as `consume_ai_extraction`.
</content>
</invoke>
