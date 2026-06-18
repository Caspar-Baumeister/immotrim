-- Bank report ("Portfolio-Finanzierungsbericht") support.
--   1. report_images — dedicated, optional photos for the report (one cover/title image
--      per user + up to a couple per property). Files live in the existing private
--      "property-documents" bucket under "{user_id}/report/...".
--   2. report_jobs — short-lived handoff between the PDF API route and the headless
--      print page. The API computes the report payload, stores it under an unguessable
--      token, then headless Chromium opens /[locale]/report/{token} (no user session) and
--      the page loads the payload via the service-role client. Rows are deleted after use.

-- ─── report_images ───────────────────────────────────────────────────────────
create table public.report_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- null + scope 'title' = the portfolio cover image; set + scope 'property' = a
  -- per-property photo.
  property_id uuid references public.properties(id) on delete cascade,
  scope text not null check (scope in ('title', 'property')),
  file_path text not null,
  created_at timestamptz not null default now()
);

create index report_images_user_property_idx on public.report_images (user_id, property_id);

alter table public.report_images enable row level security;

create policy "report_images_select_own" on public.report_images
  for select using (auth.uid() = user_id);
create policy "report_images_insert_own" on public.report_images
  for insert with check (auth.uid() = user_id);
create policy "report_images_update_own" on public.report_images
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "report_images_delete_own" on public.report_images
  for delete using (auth.uid() = user_id);

-- ─── report_jobs ─────────────────────────────────────────────────────────────
-- Only ever touched by the server (service role) — the API route inserts, the print
-- page reads, both bypassing RLS. RLS is enabled with no policies so nothing is
-- reachable with the anon/auth key directly.
create table public.report_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  locale text not null default 'de',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes'
);

create index report_jobs_expires_idx on public.report_jobs (expires_at);

alter table public.report_jobs enable row level security;
