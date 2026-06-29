-- Cleanup for the Selbstauskunft funnel's ANONYMOUS users.
--
-- New visitors start the funnel with an anonymous Supabase session
-- (auth.signInAnonymously). Most never convert, so their auth.users rows pile up.
-- When a visitor DOES sign up, their anonymous user is upgraded in place
-- (is_anonymous flips to false), so this cleanup never touches converted accounts.
--
-- Deleting from auth.users cascades to public.properties and public.documents
-- (both FK ... on delete cascade), so abandoned drafts are removed with the user.
--
-- NOTE: the underlying Storage *files* are not removed by deleting storage.objects
-- rows here. Run a periodic Storage sweep (scheduled Edge Function using the
-- storage admin API) to delete objects under folders whose user no longer exists.

create or replace function public.delete_stale_anonymous_users(p_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  with removed as (
    delete from auth.users
    where is_anonymous = true
      and created_at < now() - make_interval(days => p_days)
    returning id
  )
  select count(*) into deleted_count from removed;
  return deleted_count;
end;
$$;

-- Schedule a daily run at 03:30 UTC, but only if pg_cron is available. Enable the
-- "pg_cron" extension in the Supabase dashboard (Database → Extensions) first.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'selbstauskunft-anon-cleanup',
      '30 3 * * *',
      $cron$ select public.delete_stale_anonymous_users(30); $cron$
    );
  end if;
end;
$$;
