-- Backend Automation: pg_cron + pg_net + Vault schedules
--
-- Enables extensions, stores secrets in Vault, and schedules all three
-- Edge Functions via pg_cron + pg_net.
--
-- Timezone: Brisbane UTC+10 (no DST)
--   2:00 AM AEST = 16:00 UTC
--   7:00 AM AEST = 21:00 UTC
--   5:00 PM AEST = 07:00 UTC
--
-- IMPORTANT: Run in Supabase SQL Editor. Do NOT run via migrations CLI.
-- ⚠️ Replace YOUR_SERVICE_ROLE_KEY_HERE with the actual service role key.

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Store secrets in Vault (idempotent — delete existing first if re-running)
-- ⚠️ User must replace YOUR_SERVICE_ROLE_KEY_HERE with actual key
DO $$
BEGIN
  -- Only create if not already stored
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_url') THEN
    PERFORM vault.create_secret('https://sujyalrzbubvhpkntwja.supabase.co', 'project_url');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN
    PERFORM vault.create_secret('YOUR_SERVICE_ROLE_KEY_HERE', 'service_role_key');
  END IF;
END $$;

-- ============================================================
-- Schedule 1: Nightly Lead-Score Recompute
-- Runs at 2:00 AM AEST = 16:00 UTC daily
-- ============================================================
SELECT cron.schedule(
  'nightly-lead-score-recompute',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/nightly-lead-score-recompute',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('triggered_at', now()::text, 'source', 'pg_cron')
  ) AS request_id;
  $$
);

-- ============================================================
-- Schedule 2: Daily Birthday Reminders
-- Runs at 7:00 AM AEST = 21:00 UTC daily
-- ============================================================
SELECT cron.schedule(
  'daily-birthday-reminders',
  '0 21 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/birthday-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('triggered_at', now()::text, 'source', 'pg_cron')
  ) AS request_id;
  $$
);

-- ============================================================
-- Schedule 3: Notification Digest
-- Runs at 7:00 AM AEST (21:00 UTC) and 5:00 PM AEST (07:00 UTC) daily
-- ============================================================
SELECT cron.schedule(
  'notification-digest',
  '0 21,7 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/notification-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('triggered_at', now()::text, 'source', 'pg_cron')
  ) AS request_id;
  $$
);
