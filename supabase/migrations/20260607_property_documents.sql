-- Per-property document storage ("little drive") + AI extraction source files.
-- Files live in a private Storage bucket; metadata rows live in public.documents.
-- All access is scoped to the owning auth user via RLS.

-- ─── documents table ─────────────────────────────────────────────────────────
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- null while the file is a pre-save "draft" upload on the New Property page;
  -- set once the property is created (see linkDraftDocuments()).
  property_id uuid references public.properties(id) on delete cascade,
  -- groups draft uploads made before the property row exists; nulled on link.
  draft_id uuid,
  file_name text not null,
  file_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index documents_user_property_idx on public.documents (user_id, property_id);
create index documents_user_draft_idx on public.documents (user_id, draft_id);

alter table public.documents enable row level security;

create policy "documents_select_own" on public.documents
  for select using (auth.uid() = user_id);
create policy "documents_insert_own" on public.documents
  for insert with check (auth.uid() = user_id);
create policy "documents_update_own" on public.documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "documents_delete_own" on public.documents
  for delete using (auth.uid() = user_id);

-- ─── storage bucket ──────────────────────────────────────────────────────────
-- Private bucket; objects are keyed under "{user_id}/..." so RLS can scope by folder.
insert into storage.buckets (id, name, public)
values ('property-documents', 'property-documents', false)
on conflict (id) do nothing;

-- Each user may only touch objects whose first path segment is their own uid.
create policy "property_documents_select_own" on storage.objects
  for select using (
    bucket_id = 'property-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "property_documents_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'property-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "property_documents_update_own" on storage.objects
  for update using (
    bucket_id = 'property-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "property_documents_delete_own" on storage.objects
  for delete using (
    bucket_id = 'property-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
