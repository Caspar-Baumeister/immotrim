# Immotrim — Go-Live Runbook

Step-by-step for the manual (dashboard) work needed to take Immotrim public.
The code-side work (auth callback, email confirmation flow, password reset,
legal pages, polish) is already done. Do the steps roughly in this order.

---

## 1. Domain + Vercel hosting

1. **Buy a domain** (e.g. at Namecheap, Porkbun, or your registrar of choice).
2. **Create a Vercel project**: vercel.com → Add New → Project → import this git repo.
   - Framework preset: **Next.js** (auto-detected). Build command `next build`, no changes needed.
   - Vercel sets `NODE_ENV=production` automatically → the app will use your **LIVE** Stripe keys.
3. **Connect the domain**: Vercel → Project → Settings → Domains → add your domain and follow the DNS instructions.
4. **Add environment variables** (Vercel → Settings → Environment Variables, scope = **Production**). See the full list in §5.
5. Deploy. Confirm the build succeeds (it builds clean locally already).

## 2. Take Stripe live

Currently you're in **test/sandbox**. To accept real money:

1. **Activate your Stripe account**: Dashboard → complete business profile, tax info, and **bank account for payouts**. Until this is done you cannot take live charges.
2. **Switch the Dashboard to Live mode** (toggle, top of the page) and recreate your product:
   - Create the **Product** + a **monthly** recurring price and a **yearly** recurring price. (Test-mode price IDs do NOT work in live mode.)
   - Copy the two new live price IDs → these become `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_YEARLY` in Vercel.
3. **Get your live API keys**: Dashboard (Live) → Developers → API keys.
   - Secret key (`sk_live_…`) → `STRIPE_SECRET_KEY_LIVE`
   - Publishable key (`pk_live_…`) → `STRIPE_PUBLIC_KEY_LIVE`
4. **Create the live webhook**: Developers → Webhooks → Add endpoint:
   - URL: `https://<your-domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - After creating, copy the **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET` in Vercel.
5. **Configure the Customer Portal** (Live): Settings → Billing → Customer portal. Enable cancel, plan switching, payment-method update, invoice history. (The account page links here.)
6. **VAT (optional but likely needed for EU consumers)**: enable Stripe Tax, or handle VAT manually.
7. *(Optional)* **Free trial**: tell me if you want one — it's a one-line code change (`trial_period_days`) in `src/app/[locale]/auth/actions.ts` / `billing/actions.ts`.

## 3. Supabase auth + email

1. **Custom SMTP** (required for production — the built-in mailer only sends a few/hour):
   - Sign up for [Resend](https://resend.com) (or Postmark/SES), verify your sending domain.
   - Supabase → Project → Authentication → Emails → SMTP Settings → enter the SMTP host/port/user/pass and a `from` address on your domain.
2. **Enable email confirmation**: Supabase → Authentication → Providers → Email → turn **Confirm email** ON.
   - The code already handles this: signup shows a "check your inbox" screen; the confirmation link routes through `/api/auth/callback`, which logs the user in and sends them to `/pricing` to subscribe.
3. **Set the redirect allow-list**: Supabase → Authentication → URL Configuration:
   - **Site URL**: `https://<your-domain>`
   - **Redirect URLs**: add `https://<your-domain>/api/auth/callback`
4. **Customize email templates** (Confirm signup + Reset password) under Authentication → Emails — add your branding, German + English wording.
5. **Enable leaked-password protection** (clears the one security advisor): Authentication → Policies/Passwords → enable the HaveIBeenPwned check.
6. Confirm the project is on a **paid plan** if you expect steady traffic (free projects pause on inactivity).

## 4. Legal pages — fill in the content

Routes are live at `/<locale>/impressum`, `/datenschutz`, `/agb` (linked in the footer). They contain **German placeholder text** with `[bracketed]` fields and a visible "Draft" banner.

- Files: `src/app/[locale]/impressum/page.tsx`, `datenschutz/page.tsx`, `agb/page.tsx`.
- Replace every `[bracketed]` field (name, address, email, USt-IdNr, etc.).
- The Datenschutz already lists the real sub-processors (Vercel, Supabase, Stripe, Google Gemini) — keep that accurate.
- **Have a lawyer (or a generator like eRecht24) review before public launch.** The draft banner text lives in `messages/{de,en}.json` under `legal.draftNotice` — remove it once the content is final.
- **Sign the Data Processing Agreements (AVV/DPA)** in each vendor's dashboard: Stripe, Supabase, Google, Vercel.

## 5. Environment variables (set all in Vercel → Production)

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://<your-domain>` (no trailing slash) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (secret) |
| `STRIPE_SECRET_KEY_LIVE` | Stripe (Live) → Developers → API keys |
| `STRIPE_PUBLIC_KEY_LIVE` | Stripe (Live) → Developers → API keys |
| `STRIPE_PRICE_MONTHLY` | Stripe (Live) → your monthly price ID |
| `STRIPE_PRICE_YEARLY` | Stripe (Live) → your yearly price ID |
| `STRIPE_WEBHOOK_SECRET` | Stripe (Live) → Webhooks → your endpoint signing secret |
| `GEMINI_API_KEY` | Google AI Studio — **paid tier** key |
| `GEMINI_MODEL` | optional, defaults to `gemini-2.5-flash` |

## 6. Pre-launch checklist (do before announcing)

- [ ] Add a real product screenshot at `public/landing/hero.png` (currently a faded-logo placeholder), then swap the placeholder block in `src/app/[locale]/page.tsx` for `<Image fill .../>`.
- [ ] **End-to-end test on the live domain**: signup → confirmation email arrives → click link → land on pricing → subscribe (use a real card, then refund) → reach portfolio → add a property → upload a PDF → AI extraction works → charts render → open Stripe portal → cancel → confirm access is revoked.
- [ ] Confirm webhook events land: Stripe Dashboard shows 200s, and the `subscriptions` table reflects the new sub.
- [ ] Test **password reset** end to end (forgot-password → email → reset-password).
- [ ] Confirm confirmation + reset emails arrive in **both** German and English.
- [ ] Add **error monitoring** — Sentry, or enable Vercel Observability/Log Drains — so production failures (extraction, webhooks, auth) are visible.
- [ ] Re-run Supabase security advisors → leaked-password warning gone, no new RLS gaps.

---

### What's deferred (not blocking launch)
Upgrade/downgrade proration UI (Stripe portal covers it), dunning/retry automation beyond `past_due`, in-app email notifications, CI/CD pipeline.
