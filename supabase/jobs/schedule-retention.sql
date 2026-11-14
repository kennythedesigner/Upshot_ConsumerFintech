-- Schedules the daily retention sweep (D62).
--
-- Run this ONCE by hand in the Supabase SQL editor. It is not a migration:
--   - it is an operational command, not a schema change
--   - re-running it errors on the duplicate job name
--   - pg_cron does not exist in PGlite, so it would break the RLS tests
--
-- Already run against the Upshot Consumer Fintech project on 2026-11-14.

create extension if not exists pg_cron with schema cron;

select cron.schedule(
  'upshot-delete-stale-visitors',
  '0 3 * * *',
  $$select public.delete_stale_visitors();$$
);

-- Check it exists:
--   select jobid, jobname, schedule, active from cron.job;
--
-- Check it has been running:
--   select * from cron.job_run_details order by start_time desc limit 10;
--
-- Change the schedule (same name, replaces it):
--   select cron.unschedule('upshot-delete-stale-visitors');
--   then re-run the schedule above.
