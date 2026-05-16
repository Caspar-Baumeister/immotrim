-- Switch from anonymous-UUID-in-localStorage to real Supabase Auth users.
-- Wipes existing tables (pre-launch, no real data) and re-creates them keyed on auth.users(id).
-- Adds a subscriptions table populated by the Stripe webhook (service role only).

-- ─── properties ──────────────────────────────────────────────────────────────
drop table if exists public.properties cascade;

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  inputs jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index properties_user_id_idx on public.properties (user_id);

alter table public.properties enable row level security;

create policy "properties_select_own" on public.properties
  for select using (auth.uid() = user_id);
create policy "properties_insert_own" on public.properties
  for insert with check (auth.uid() = user_id);
create policy "properties_update_own" on public.properties
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "properties_delete_own" on public.properties
  for delete using (auth.uid() = user_id);

-- ─── wishlist_properties ─────────────────────────────────────────────────────
drop table if exists public.wishlist_properties cascade;

create table public.wishlist_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  expose_url text,
  kaufpreis numeric,
  wohnflaeche numeric,
  zimmer numeric,
  baujahr int,
  kaltmiete numeric,
  eigenanteil numeric,
  nebenkosten_pct numeric not null default 10,
  ruecklagen_pct_of_miete numeric not null default 10,
  nicht_umlagefaehig_pct_of_miete numeric not null default 5,
  leerstand_pct numeric not null default 2,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wishlist_properties_user_id_idx on public.wishlist_properties (user_id);

alter table public.wishlist_properties enable row level security;

create policy "wishlist_select_own" on public.wishlist_properties
  for select using (auth.uid() = user_id);
create policy "wishlist_insert_own" on public.wishlist_properties
  for insert with check (auth.uid() = user_id);
create policy "wishlist_update_own" on public.wishlist_properties
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wishlist_delete_own" on public.wishlist_properties
  for delete using (auth.uid() = user_id);

-- ─── subscriptions ───────────────────────────────────────────────────────────
-- One row per user. Stripe webhook (service role) is the only writer.
-- Users can read their own row to check entitlement.

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null,
  price_id text,
  plan_interval text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_stripe_customer_id_idx on public.subscriptions (stripe_customer_id);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);
-- No insert/update/delete policies: only service role (webhook) can mutate.
