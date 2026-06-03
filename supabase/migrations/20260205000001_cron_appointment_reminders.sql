-- Enable pg_cron and pg_net (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule appointment reminders to run every hour
-- Prerequisite: Add project_url and service_role_key to Supabase Vault before running this migration
-- SQL Editor: select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
--            select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');
SELECT cron.schedule(
  'appointment-reminders-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/appointment-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
