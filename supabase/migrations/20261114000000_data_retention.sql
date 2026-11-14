-- Upshot: data retention and visitor-initiated deletion (D62).
--
-- Two functions:
--   delete_my_data()        a visitor deletes their own saved data, on demand.
--   delete_stale_visitors() a scheduled sweep clears visitors who have not
--                           returned within the retention window.
--
-- Retention window: 90 days since the portfolio was last saved, or since the
-- visitor signed in if they never saved anything.
--
-- Why a sweep as well as a button: a visitor's rows are reachable only through
-- the Supabase session token in their browser (D58). Clear the browser and the
-- rows are unreachable by the visitor and by us, so no deletion request can
-- find them. Expiry is the only thing that clears those.
--
-- The cron job that runs the sweep is NOT in this file; it is run once by hand.
-- See supabase/jobs/schedule-retention.sql.

-- ── A visitor deletes their own data ────────────────────────────────────────
-- SECURITY INVOKER: runs as the visitor, so the RLS delete policy still applies.
-- public.goal cascades from public.portfolio, so one delete clears both.

create or replace function public.delete_my_data()
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.portfolio where owner_id = (select auth.uid());
$$;

revoke all on function public.delete_my_data() from public, anon;
grant execute on function public.delete_my_data() to authenticated;

comment on function public.delete_my_data() is
  'Deletes the calling visitor''s portfolio and its goals. Called from the Delete my saved data control.';

-- ── The scheduled sweep ─────────────────────────────────────────────────────
-- SECURITY DEFINER so it can remove the auth.users row as well; public.portfolio
-- cascades from auth.users, so deleting the visitor clears everything.
-- The left join also catches visitors who opened the tool and never saved.
-- No role may call this directly; only the cron job runs it.

create or replace function public.delete_stale_visitors()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  with stale as (
    select u.id
    from auth.users u
    left join public.portfolio p on p.owner_id = u.id
    where u.is_anonymous
      and coalesce(p.updated_at, u.created_at) < now() - interval '90 days'
  )
  delete from auth.users u using stale s where u.id = s.id;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.delete_stale_visitors() from public, anon, authenticated;

comment on function public.delete_stale_visitors() is
  'Deletes anonymous visitors untouched for 90 days, and their portfolio and goals by cascade. Run daily by the upshot-delete-stale-visitors cron job.';
