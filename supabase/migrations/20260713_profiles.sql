-- Per-user "Bank-Ready" profile: personal master data (Stammdaten), household
-- budget (Haushaltsrechnung) and investor strategy (Strategie). One row per user,
-- mirroring public.subscriptions. Each section is jsonb so the field catalog can
-- evolve without a migration (same pattern as properties.inputs).
--
-- Also adds a `category` column to public.documents so uploads can belong to a
-- profile section (haushalt/stammdaten/strategie) instead of a property.

-- ─── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stammdaten jsonb not null default '{}'::jsonb,
  haushalt jsonb not null default '{}'::jsonb,
  strategie jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = user_id);

-- ─── documents.category ──────────────────────────────────────────────────────
-- null = legacy / property-scoped upload. Non-null values group per-user uploads
-- under a profile section. property_id is already nullable, so no other change
-- is needed to attach a document to a section instead of a property.
alter table public.documents
  add column category text;

create index documents_user_category_idx
  on public.documents (user_id, category);
