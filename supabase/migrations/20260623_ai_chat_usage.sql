-- Per-user monthly AI portfolio-chat quota. Mirrors ai_extraction_usage exactly:
-- one row per (user, calendar month), users may read their own row, and the count
-- is mutated only through the security-definer RPC below so a user can't reset
-- their own counter via the REST API.

create table if not exists public.ai_chat_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null,                       -- UTC calendar month, "YYYY-MM"
  count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, period)
);

alter table public.ai_chat_usage enable row level security;

create policy "ai_chat_usage_select_own" on public.ai_chat_usage
  for select using (auth.uid() = user_id);
-- No insert/update/delete policies: only the security-definer RPC can mutate.

-- Atomically increment the caller's current-month chat counter, capped at p_limit.
-- Returns whether the call was allowed (still under the limit) and the resulting count.
create or replace function public.consume_ai_chat(p_limit int)
returns table (allowed boolean, used int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char((now() at time zone 'utc'), 'YYYY-MM');
  v_count int;
begin
  insert into public.ai_chat_usage (user_id, period, count)
  values (auth.uid(), v_period, 0)
  on conflict (user_id, period) do nothing;

  update public.ai_chat_usage
    set count = count + 1, updated_at = now()
    where user_id = auth.uid() and period = v_period and count < p_limit
    returning count into v_count;

  if v_count is null then
    -- Limit reached: report current usage without incrementing.
    select count into v_count from public.ai_chat_usage
      where user_id = auth.uid() and period = v_period;
    return query select false, v_count;
  else
    return query select true, v_count;
  end if;
end;
$$;

grant execute on function public.consume_ai_chat(int) to authenticated;
