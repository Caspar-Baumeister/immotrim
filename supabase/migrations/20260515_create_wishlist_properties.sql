-- Wishlist (Vergleichsliste) of candidate properties to potentially buy.
-- Mirrors the access pattern of `properties`: app-level filtering by anon_user_id,
-- RLS open to anon role (no Supabase auth yet — anon UUIDs live in localStorage).

create table if not exists public.wishlist_properties (
  id uuid primary key default gen_random_uuid(),
  anon_user_id uuid not null,
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

create index if not exists wishlist_properties_anon_user_id_idx
  on public.wishlist_properties (anon_user_id);

alter table public.wishlist_properties enable row level security;

create policy "wishlist_anon_select" on public.wishlist_properties for select using (true);
create policy "wishlist_anon_insert" on public.wishlist_properties for insert with check (true);
create policy "wishlist_anon_update" on public.wishlist_properties for update using (true);
create policy "wishlist_anon_delete" on public.wishlist_properties for delete using (true);
