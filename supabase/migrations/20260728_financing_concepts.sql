-- Finanzierungskonzepte: one row per financing case ("Konzept") — the user's
-- description of WHAT they want to finance (möbliertes Apartment, WG-Konzept, …)
-- plus the requested financing. A concept may optionally reference a wishlist
-- (Objektanalyse) row it was prefilled from. `objekt`/`finanzierung` are jsonb so
-- the field catalog can evolve without a migration (same pattern as
-- profiles.stammdaten / properties.inputs).
--
-- Also adds `concept_id` to public.documents so object documents can belong to a
-- concept, and `concept_bank_requests` to track outreach status per (concept, bank).

-- ─── financing_concepts ──────────────────────────────────────────────────────
create table public.financing_concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  -- 'moebliertes_apartment' | 'wg' | 'klassische_vermietung' | 'eigennutzung' | 'custom'
  concept_type text,
  description text,
  wishlist_property_id uuid references public.wishlist_properties(id) on delete set null,
  objekt jsonb not null default '{}'::jsonb,
  finanzierung jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.financing_concepts enable row level security;

create policy "financing_concepts_select_own" on public.financing_concepts
  for select using (auth.uid() = user_id);
create policy "financing_concepts_insert_own" on public.financing_concepts
  for insert with check (auth.uid() = user_id);
create policy "financing_concepts_update_own" on public.financing_concepts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "financing_concepts_delete_own" on public.financing_concepts
  for delete using (auth.uid() = user_id);

create index financing_concepts_user_idx on public.financing_concepts (user_id);

-- ─── documents.concept_id ────────────────────────────────────────────────────
-- Deleting a concept deletes its uploads (stated in the delete confirm dialog).
alter table public.documents
  add column concept_id uuid references public.financing_concepts(id) on delete cascade;

create index documents_user_concept_idx on public.documents (user_id, concept_id);

-- ─── concept_bank_requests ───────────────────────────────────────────────────
-- Lightweight outreach tracking: one row per (concept, bank) once the user
-- interacts with a bank for that concept. bank_id references the TS registry
-- (src/features/banks/registry.ts), not a table.
create table public.concept_bank_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid not null references public.financing_concepts(id) on delete cascade,
  bank_id text not null,
  status text not null default 'entwurf'
    check (status in ('entwurf', 'angefragt', 'in_gespraech', 'zusage', 'absage')),
  sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (concept_id, bank_id)
);

alter table public.concept_bank_requests enable row level security;

create policy "concept_bank_requests_select_own" on public.concept_bank_requests
  for select using (auth.uid() = user_id);
create policy "concept_bank_requests_insert_own" on public.concept_bank_requests
  for insert with check (auth.uid() = user_id);
create policy "concept_bank_requests_update_own" on public.concept_bank_requests
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "concept_bank_requests_delete_own" on public.concept_bank_requests
  for delete using (auth.uid() = user_id);

create index concept_bank_requests_user_idx on public.concept_bank_requests (user_id);
