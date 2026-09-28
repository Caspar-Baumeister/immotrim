-- iPhone app billing via RevenueCat (App Store). The subscriptions table gets a
-- "source" column so the RevenueCat webhook and the Stripe webhook can coexist on
-- the same one-row-per-user table without stepping on each other, plus the two
-- RevenueCat identifiers. Idempotent: safe to re-run.
--
-- The UNIQUE constraints on stripe_customer_id / stripe_subscription_id stay:
-- Postgres treats NULLs as distinct in unique constraints, so any number of
-- RevenueCat rows (both stripe ids NULL) can coexist.

alter table public.subscriptions
  add column if not exists source text not null default 'stripe';

alter table public.subscriptions
  add column if not exists rc_app_user_id text;

alter table public.subscriptions
  add column if not exists rc_product_id text;

create index if not exists subscriptions_rc_app_user_id_idx
  on public.subscriptions (rc_app_user_id);
