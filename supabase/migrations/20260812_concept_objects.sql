-- Konzept-Objekte: a concept becomes a strategy container holding MULTIPLE
-- candidate objects. Each object is created inside a concept (manually or via
-- exposé AI extraction). `data` holds the canonical KonzeptObjekt shape that
-- feeds the anfrage email / Selbstauskunft; `details` holds extraction extras
-- (hausgeld, energie, makler, …) — both jsonb so the catalog can evolve without
-- a migration (same pattern as financing_concepts.objekt).
--
-- Additive only: financing_concepts.objekt / wishlist_property_id stay for now
-- (deployed app keeps working); drop them in a later cleanup migration.

-- ─── concept_objects ─────────────────────────────────────────────────────────
create table public.concept_objects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid not null references public.financing_concepts(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.concept_objects enable row level security;

create policy "concept_objects_select_own" on public.concept_objects
  for select using (auth.uid() = user_id);
create policy "concept_objects_insert_own" on public.concept_objects
  for insert with check (auth.uid() = user_id);
create policy "concept_objects_update_own" on public.concept_objects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "concept_objects_delete_own" on public.concept_objects
  for delete using (auth.uid() = user_id);

create index concept_objects_user_concept_idx on public.concept_objects (user_id, concept_id);

-- ─── documents.object_id ─────────────────────────────────────────────────────
-- Exposé uploads attach to a specific object (and keep concept_id set, so
-- concept-level queries and storage cleanup continue to work). Docs with
-- object_id null count as shared concept documents.
alter table public.documents
  add column object_id uuid references public.concept_objects(id) on delete cascade;

create index documents_concept_object_idx on public.documents (concept_id, object_id);

-- ─── concept_bank_requests.object_id ─────────────────────────────────────────
-- Records which object was sent with the request. Uniqueness stays per
-- (concept, bank) — one outreach status per bank per concept.
alter table public.concept_bank_requests
  add column object_id uuid references public.concept_objects(id) on delete set null;

-- ─── Seed: migrate inline objekt data into one object per concept ────────────
insert into public.concept_objects (user_id, concept_id, data, created_at, updated_at)
select user_id, id, objekt, created_at, updated_at
from public.financing_concepts
where objekt <> '{}'::jsonb;

comment on column public.financing_concepts.objekt is
  'DEPRECATED: superseded by concept_objects.data — drop together with wishlist_property_id in a follow-up migration.';
