-- Process CRM workflow enrollments (process-workflows Edge Function)
-- ------------------------------------------------------------------
-- Run in Supabase SQL Editor after pg_cron + pg_net + Vault are set up
-- (see migrations/20260404000003_backend_automation_cron_schedules.sql).
-- Replace YOUR_SERVICE_ROLE_KEY_HERE in Vault if not already done.
--
-- Every 5 minutes UTC (adjust if you prefer AEST-aligned times).

SELECT cron.schedule(
  'process-workflows',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/process-workflows',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('triggered_at', now()::text, 'source', 'pg_cron')
  ) AS request_id;
  $$
);

-- To remove: SELECT cron.unschedule('process-workflows');
