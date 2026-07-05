-- Public portfolio sharing. One always-on link per user: a random, non-enumerable
-- token maps to the owning user. Anonymous viewers open /[locale]/share/[token];
-- that page reads this table + the user's properties via the SERVICE-ROLE client
-- (bypassing RLS), so there is deliberately NO public read policy here — the table
-- stays locked to its owner and only the server can resolve a token.

create table public.portfolio_shares (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.portfolio_shares enable row level security;

-- Owner-only management. Public resolution happens server-side via service role.
create policy "portfolio_shares_select_own" on public.portfolio_shares
  for select using (auth.uid() = user_id);
create policy "portfolio_shares_insert_own" on public.portfolio_shares
  for insert with check (auth.uid() = user_id);
create policy "portfolio_shares_delete_own" on public.portfolio_shares
  for delete using (auth.uid() = user_id);
