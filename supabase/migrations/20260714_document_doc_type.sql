-- Per-document classification for the "Unterlagen Checkliste".
--
-- Borrower/personal documents (property_id IS NULL AND draft_id IS NULL) are
-- classified by the AI into a checklist doc type (see src/lib/checklist/
-- requirements.ts) so the checklist grid can show which items are present and
-- which are still missing. Cross-cuts every category (stammdaten/haushalt/
-- strategie/checklist), so it lives on the row rather than in section jsonb.
--
-- Nullable: existing rows and freshly uploaded, not-yet-classified files carry
-- NULL until the AI sorts them. Existing RLS (documents_update_own) already
-- covers writes to this column. No backfill.

alter table public.documents add column if not exists doc_type text;
