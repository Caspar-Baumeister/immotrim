# Immotrim: architecture

Read this first when something in auth, data, billing or deployment misbehaves.

## What Immotrim does (since the 2026-11 relaunch)

1. **Documents**: users upload purchase, loan and rental contracts per property;
   Gemini reads the numbers out (`/api/extract`).
2. **Portfolio**: dashboard, property list and property pages with KPIs and charts,
   plus "Was dein Vermögen gerade bewegt" (`src/features/portfolio/forces.ts`).
3. **Bank overview**: today's values per property and in total, no projections
   (`/bankuebersicht`, `/api/bank-overview`, PDF via headless Chrome).

## Stack

| Part | Where |
|------|-------|
| App | Next.js on Vercel, project `immotrim-ypn7`, `main` = www.immotrim.com |
| Auth | Firebase Auth (email/password, Google), project `immo-2d39f` ("Immotrim") |
| Data | Cloud Firestore, `europe-west3` (Frankfurt) |
| Files | Cloud Storage for Firebase (`immo-2d39f.firebasestorage.app`) |
| Billing | Stripe (Checkout, Customer Portal, webhook `/api/stripe/webhook`) |
| AI | Gemini API (`GEMINI_API_KEY`, server only) |

One live database, no staging. Local development uses the Firebase emulators.

## Auth

- Login runs in the browser with the Firebase SDK (`src/app/auth/client-auth.ts`).
  The fresh ID token goes to `POST /api/auth/session`, which sets the httpOnly
  `__session` cookie (Firebase session cookie, 14 days) and creates `users/{uid}`.
- Server code reads the user with `getSessionUser()` / `verifySession()`
  (`src/lib/firebase/session.ts`, `src/lib/dal.ts`). `src/proxy.ts` only checks
  that the cookie exists; the `(app)` layout verifies it.
- On immotrim.com the Google popup runs through our own domain:
  `next.config.ts` rewrites `/__/auth/*` to `immo-2d39f.firebaseapp.com`, and
  `authDomain` is the current host (`src/lib/firebase/config.ts`). The OAuth client
  in Google Cloud lists both immotrim.com hosts as origins and
  `/__/auth/handler` redirect URIs.
- Logout (`/api/auth/logout`) clears the cookie and revokes refresh tokens.

## Data model (Firestore)

```
users/{uid}                      email, displayName, createdAt,
                                 subscription {status, stripe_*, price_id, plan_interval,
                                               current_period_end, cancel_at_period_end},
                                 aiUsage {"YYYY-MM": count}
users/{uid}/properties/{id}      name, address, inputs (PropertyInputs), created_at, updated_at
users/{uid}/documents/{id}       property_id | draft_id, file_name, file_path, mime_type,
                                 size_bytes, doc_type, created_at
```

Firestore rules deny all client access: every read and write goes through server
actions (`src/lib/property-service.ts`, `src/lib/document-actions.ts`) and route
handlers with Firebase Admin.

## Files

Browsers upload straight to `users/{uid}/documents/{docId}/{file}` (Storage rules:
own folder only, create only, PDF or image, under 25 MB), so Vercel's request size
limit does not apply. The server then records the document
(`registerDocument`). Downloads go through `/api/documents/[id]`. If the browser
SDK lost its sign-in, `ensureClientUser()` trades the session for a custom token.

## Plans

- Free: one property, every KPI, 3 document reads per month.
- Plus: Stripe subscription (monthly or yearly), unlimited properties, 300 reads,
  bank overview PDF. `isEntitled()` = status active or trialing and period not over.
- The webhook finds the user by `subscription.stripe_customer_id`, falling back to
  `metadata.user_id`; `/api/billing/checkout-return` syncs synchronously after
  Checkout.

## Account deletion

`POST /api/account/delete`: cancels the Stripe subscription (stops if Stripe
fails), deletes `users/{uid}/` in Storage, the Firestore tree and the Auth user.

## Environment variables (Vercel)

| Var | Purpose |
|-----|---------|
| `FIREBASE_SERVICE_ACCOUNT` | Service account JSON (base64) for Firebase Admin |
| `STRIPE_SECRET_KEY` or `STRIPE_SECRET_KEY_LIVE`/`_TEST` | Stripe secret |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` | Plus prices |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Document extraction |
| `NEXT_PUBLIC_APP_URL` | Absolute links (Stripe return URLs) |
| `AI_EXTRACTION_MONTHLY_LIMIT`, `FREE_MONTHLY_EXTRACTIONS` | Optional limits |

The Firebase web config is public and lives in `src/lib/firebase/config.ts`.

## Local development

```
npm run emulators      # auth 9299, firestore 8288, storage 9399, UI 4100 (JDK 21)
npm run dev -- -p 3100
```

`.env.development.local` points the app at the emulators. Stripe uses the test key
from `.env.local`.

## Migration from Supabase

`scripts/migrate-from-supabase.mjs` (run by `scripts/go-live.sh`) imports users with
their Supabase UUIDs and bcrypt hashes, Google identities, subscriptions,
properties and property documents. Selbstauskunft, wishlist and profile data stay
behind on purpose.
