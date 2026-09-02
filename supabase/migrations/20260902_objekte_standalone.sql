-- Objekte standalone: the "Konzept" layer is removed from the product. The
-- investor narrative lives in profiles.strategie; objects (concept_objects)
-- are promoted to standalone top-level entities, each carrying its OWN
-- finanzierung (previously financing_concepts.finanzierung), and the bank flow
-- (concept_bank_requests, documents, Selbstauskunft) is keyed by object, not
-- concept.
--
-- Table names keep their historical "concept_" prefix — renaming would touch
-- RLS policies, indexes and generated types on both remote projects for no
-- user-facing benefit.
--
-- financing_concepts stays dormant (no code reads/writes it after this
-- deploy). Follow-up cleanup migration (after this has soaked): drop
-- financing_concepts, documents.concept_id, concept_objects.concept_id,
-- concept_bank_requests.concept_id.
--
-- DEPLOY ORDER: push this migration BEFORE deploying the code — the client
-- upserts concept_bank_requests with onConflict (object_id, bank_id), which
-- needs the unique constraint created below.

-- ─── 1. Per-object financing need ────────────────────────────────────────────
alter table public.concept_objects
  add column if not exists finanzierung jsonb not null default '{}'::jsonb;

-- ─── 2. Concepts without any object get one, so their finanzierung and any
--        bank requests survive the promotion (concepts WITH objekt data were
--        already seeded in 20260812) ──────────────────────────────────────────
insert into public.concept_objects (user_id, concept_id, data, finanzierung)
select fc.user_id, fc.id, '{}'::jsonb, fc.finanzierung
from public.financing_concepts fc
where not exists (
  select 1 from public.concept_objects o where o.concept_id = fc.id
);

-- ─── 3. Copy each concept's finanzierung onto its objects ────────────────────
update public.concept_objects o
set finanzierung = fc.finanzierung
from public.financing_concepts fc
where o.concept_id = fc.id
  and o.finanzierung = '{}'::jsonb
  and fc.finanzierung <> '{}'::jsonb;

-- ─── 4. Reassign shared concept documents (object_id null) to the concept's
--        oldest object ───────────────────────────────────────────────────────
with first_obj as (
  select distinct on (concept_id) concept_id, id
  from public.concept_objects
  where concept_id is not null
  order by concept_id, created_at asc
)
update public.documents d
set object_id = f.id
from first_obj f
where d.concept_id = f.concept_id
  and d.object_id is null;

-- ─── 5. Backfill bank requests to the concept's oldest object ────────────────
with first_obj as (
  select distinct on (concept_id) concept_id, id
  from public.concept_objects
  where concept_id is not null
  order by concept_id, created_at asc
)
update public.concept_bank_requests r
set object_id = f.id
from first_obj f
where r.concept_id = f.concept_id
  and r.object_id is null;

-- ─── 6. Requests are now per (object, bank) ──────────────────────────────────
-- Safety net (step 5 covers every row — every concept has an object after
-- step 2, and concept_id was NOT NULL): expect 0 rows.
delete from public.concept_bank_requests where object_id is null;

alter table public.concept_bank_requests
  drop constraint concept_bank_requests_object_id_fkey;
alter table public.concept_bank_requests
  add constraint concept_bank_requests_object_id_fkey
    foreign key (object_id) references public.concept_objects(id) on delete cascade;
alter table public.concept_bank_requests
  alter column object_id set not null;
alter table public.concept_bank_requests
  alter column concept_id drop not null;
-- No duplicates possible: an object belongs to exactly one concept, so
-- unique (concept_id, bank_id) implies unique (object_id, bank_id).
alter table public.concept_bank_requests
  drop constraint concept_bank_requests_concept_id_bank_id_key;
alter table public.concept_bank_requests
  add constraint concept_bank_requests_object_bank_key unique (object_id, bank_id);

-- ─── 7. Objects stand alone ──────────────────────────────────────────────────
alter table public.concept_objects
  alter column concept_id drop not null;

-- ─── 8. Deprecation markers ──────────────────────────────────────────────────
comment on table public.financing_concepts is
  'DEPRECATED (2026-09-02): the Konzept layer was removed — objects (concept_objects) are standalone. Dormant; drop in a follow-up cleanup migration.';
comment on column public.documents.concept_id is
  'DEPRECATED (2026-09-02): documents are keyed by object_id now. Drop in a follow-up cleanup migration.';
comment on column public.concept_objects.concept_id is
  'DEPRECATED (2026-09-02): objects are standalone. Drop in a follow-up cleanup migration.';
comment on column public.concept_bank_requests.concept_id is
  'DEPRECATED (2026-09-02): requests are unique per (object_id, bank_id). Drop in a follow-up cleanup migration.';
