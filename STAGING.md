# Immotrim — Staging environment (dev.immotrim.com)

A separate **test** deployment that mirrors production but runs on Stripe **test** keys and
a **separate** Supabase project, so you can try things end-to-end without touching live
data or real money.

**How it works:** the code is identical on every deploy — the environment is chosen by
*configuration*, not by branching. Vercel gives each env var a different value per scope:

| | Branch | Domain | Stripe | Supabase |
|---|---|---|---|---|
| **Production** | `main` | `immotrim.com` | live keys + live price IDs | prod project |
| **Preview / staging** | `staging` | `dev.immotrim.com` | test keys + test price IDs | staging project |
| **Local** | — | `localhost:3000` | test keys (`.env.local`) | either project |

> The app selects the Stripe secret key from the canonical `STRIPE_SECRET_KEY` (set per
> scope). If that's unset it falls back to `STRIPE_SECRET_KEY_TEST`/`_LIVE` keyed off
> `VERCEL_ENV` (`production` only on the prod deploy — previews are `preview`). It does
> **not** use `NODE_ENV`, which Vercel sets to `production` on every deploy.

---

## A. Create the staging Supabase project (test DB)

1. supabase.com → **New project** (the free tier allows a second project) → name it e.g.
   `immotrim-staging`.
2. Apply the schema — run **every** file in `supabase/migrations/` **in filename order**
   in the SQL Editor (or `supabase db push` if you link the CLI). The migrations are
   additive and idempotent, so re-running is safe. As of this writing, in order:
   - `supabase/migrations/20260515_create_wishlist_properties.sql`
   - `supabase/migrations/20260516_auth_and_subscriptions.sql`
   - `supabase/migrations/20260607_property_documents.sql`
   - `supabase/migrations/20260613_wishlist_rich_model.sql`
   - `supabase/migrations/20260614_ai_extraction_usage.sql`

   > Whenever a new migration is added to the repo, apply it to the staging project too —
   > staging is a **separate** Supabase project and does not auto-receive migrations.
3. Copy its **Project URL**, **anon key**, and **service-role key** (Project Settings → API)
   for the Preview env vars in §C.
4. Authentication → **URL Configuration**: Site URL `https://dev.immotrim.com`; add
   `https://dev.immotrim.com/api/auth/callback` to the redirect allow-list (so auth emails
   link to staging, not prod).

## B. Create the `staging` branch + domain

1. `git branch staging && git push -u origin staging`
2. Vercel → Project → Settings → **Domains** → add `dev.immotrim.com` and assign it to the
   `staging` branch. Add the DNS record the dashboard shows (`CNAME dev → cname.vercel-dns.com`).

## C. Environment variables (Vercel → Settings → Environment Variables)

Set each value under the correct **scope**. For the staging values, use Preview scope —
where the dashboard allows it, restrict them to the **`staging` branch** so other preview
branches don't inherit staging config.

| Variable | Production (`immotrim.com`) | Preview / `staging` (`dev.immotrim.com`) |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_…` | `sk_test_…` |
| `STRIPE_PRICE_MONTHLY` | live price id | test price id |
| `STRIPE_PRICE_YEARLY` | live price id | test price id |
| `STRIPE_WEBHOOK_SECRET` | live endpoint `whsec_…` | test endpoint `whsec_…` |
| `NEXT_PUBLIC_SUPABASE_URL` | prod project url | staging project url |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod anon key | staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | prod service-role key | staging service-role key |
| `NEXT_PUBLIC_APP_URL` | `https://immotrim.com` | `https://dev.immotrim.com` |
| `GEMINI_API_KEY` | paid key | same (or a separate key) |
| `GEMINI_MODEL` | optional | optional |

> **`NEXT_PUBLIC_APP_URL` on staging is not optional.** On a preview deploy Vercel still
> exposes `VERCEL_PROJECT_PRODUCTION_URL=immotrim.com`, so without the override, staging
> redirects and auth-email links would point at production. Setting it forces
> `dev.immotrim.com`.

## D. Stripe webhooks — two endpoints, one per mode

Each Stripe mode has its own endpoint and its own signing secret.

- **Test mode** → endpoint `https://dev.immotrim.com/api/stripe/webhook` → signing secret
  goes to the **Preview** `STRIPE_WEBHOOK_SECRET`.
- **Live mode** → endpoint `https://immotrim.com/api/stripe/webhook` → signing secret goes
  to the **Production** `STRIPE_WEBHOOK_SECRET`.
- Subscribe both to: `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`.

---

## Day-to-day workflow

- Push to **`staging`** → deploys `dev.immotrim.com` (test keys, staging DB).
- Merge **`staging` → `main`** → deploys `immotrim.com` (live keys, prod DB).
- Local dev keeps using `.env.local` (test keys).

## Verify it works

1. **Staging isolation:** push `staging`, open `dev.immotrim.com`, subscribe with the
   Stripe test card `4242 4242 4242 4242` → the subscription row appears in the **staging**
   Supabase project, not prod.
2. **Redirects/emails:** sign up + check out on staging → auth-email link and Stripe
   success/return URLs use `dev.immotrim.com`.
3. **Webhook:** Stripe **test-mode** dashboard shows 200s for the `dev.immotrim.com` endpoint.
4. **Prod prices:** on `immotrim.com`, pricing cards show € amounts — confirms live secret
   key and live price IDs are a matched set (a test price ID with a live key renders blank).
