-- Backend Automation: Lead score recompute, birthday reminders, notification digest
-- Run in Supabase SQL Editor. Requires pg_cron, pg_net, and Vault extensions.

-- ============================================================================
-- 1. Enable extensions (idempotent)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- 2. Vault secrets (run once — replace YOUR_SERVICE_ROLE_KEY_HERE)
-- ============================================================================
-- Only run these if the secrets don't already exist:
-- SELECT vault.create_secret('https://sujyalrzbubvhpkntwja.supabase.co', 'project_url');
-- SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY_HERE', 'service_role_key');

-- ============================================================================
-- 3. recalculate_all_contact_scores_system() — system-level (no auth.uid)
--    Re-derives lead_temperature for all contacts where source != 'manual'.
--    Mirrors the TypeScript logic in leadCategoryDerivation.ts.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_all_contact_scores_system()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total    INTEGER := 0;
  v_updated  INTEGER := 0;
  v_skipped  INTEGER := 0;
  rec        RECORD;
  v_is_buyer BOOLEAN;
  v_is_seller BOOLEAN;
  v_derived  TEXT;
  v_meta     JSONB;
BEGIN
  FOR rec IN
    SELECT
      c.id,
      c.role_category,
      c.timeframe_category,
      c.lead_temperature,
      c.do_not_contact,
      c.buying_budget_min,
      c.selling_intentions,
      c.classification_meta
    FROM public.contacts c
  LOOP
    v_total := v_total + 1;

    v_meta := COALESCE(rec.classification_meta, '{}'::jsonb);

    -- Skip manually-locked temperatures
    IF v_meta->'lead_temperature'->>'source' = 'manual' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Determine buyer/seller from role_category
    v_is_buyer := rec.role_category IN (
      'BUYER_FIRST_HOME', 'BUYER_UPGRADER', 'BUYER_DOWNSIZER', 'BUYER_INVESTOR'
    );
    v_is_seller := rec.role_category IN (
      'SELLER_OWNER_OCCUPIER', 'SELLER_INVESTOR', 'SELLER_DISTRESSED',
      'LANDLORD', 'PAST_CLIENT_SELLER'
    );

    -- Derive temperature (mirrors deriveLeadTemperature in TS)
    IF COALESCE(rec.do_not_contact, false) THEN
      v_derived := 'LEAD_ARCHIVED';
    ELSIF rec.timeframe_category = 'TIMEFRAME_0_3_MONTHS'
      AND (
        (v_is_buyer AND COALESCE(rec.buying_budget_min, 0) > 0)
        OR (v_is_seller AND COALESCE(rec.selling_intentions, '') <> '')
      )
    THEN
      v_derived := 'LEAD_HOT';
    ELSIF rec.timeframe_category = 'TIMEFRAME_0_3_MONTHS' THEN
      v_derived := 'LEAD_WARM';
    ELSIF rec.timeframe_category IN ('TIMEFRAME_3_6_MONTHS', 'TIMEFRAME_6_12_MONTHS') THEN
      v_derived := 'LEAD_WARM';
    ELSIF rec.timeframe_category IN ('TIMEFRAME_12_24_MONTHS', 'TIMEFRAME_24_PLUS_MONTHS', 'TIMEFRAME_UNKNOWN') THEN
      v_derived := 'LEAD_COLD';
    ELSE
      v_derived := 'LEAD_COLD';
    END IF;

    -- Only update if temperature changed
    IF rec.lead_temperature IS DISTINCT FROM v_derived THEN
      UPDATE public.contacts
      SET
        lead_temperature = v_derived,
        classification_meta = jsonb_set(
          COALESCE(classification_meta, '{}'::jsonb),
          '{lead_temperature}',
          '{"source": "derived"}'::jsonb
        ),
        updated_at = now()
      WHERE id = rec.id;
      v_updated := v_updated + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'total_contacts', v_total,
    'updated', v_updated,
    'skipped_manual_or_unchanged', v_skipped,
    'completed_at', now()::text
  );
END;
$$;

COMMENT ON FUNCTION public.recalculate_all_contact_scores_system IS
  'System-level nightly recompute of lead_temperature for all contacts. Skips manually-locked temperatures.';

-- ============================================================================
-- 4. Add date_of_birth column to contacts
-- ============================================================================
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

COMMENT ON COLUMN public.contacts.date_of_birth IS 'Contact date of birth for birthday reminder notifications';

-- ============================================================================
-- 5. generate_birthday_reminders() — finds birthdays in next 7 days
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_birthday_reminders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today         DATE;
  v_created       INTEGER := 0;
  v_skipped_dup   INTEGER := 0;
  v_total_matches INTEGER := 0;
  rec             RECORD;
  v_birthday_this_year DATE;
  v_display_date  TEXT;
  v_contact_name  TEXT;
  v_existing      INTEGER;
BEGIN
  -- Use Brisbane time (UTC+10) for date calculations
  v_today := (now() AT TIME ZONE 'Australia/Brisbane')::date;

  FOR rec IN
    SELECT
      c.id AS contact_id,
      c.user_id,
      c.name,
      c.first_name,
      c.last_name,
      c.date_of_birth
    FROM public.contacts c
    WHERE c.date_of_birth IS NOT NULL
      -- Match birthdays in the next 7 days (month + day comparison, wrapping year-end)
      AND (
        (
          EXTRACT(MONTH FROM c.date_of_birth) * 100 + EXTRACT(DAY FROM c.date_of_birth)
        ) BETWEEN
          (EXTRACT(MONTH FROM v_today) * 100 + EXTRACT(DAY FROM v_today))
          AND
          (EXTRACT(MONTH FROM (v_today + INTERVAL '7 days')) * 100 + EXTRACT(DAY FROM (v_today + INTERVAL '7 days')))
        -- Handle year-end wrap (e.g. Dec 28 → Jan 3)
        OR (
          EXTRACT(MONTH FROM v_today) * 100 + EXTRACT(DAY FROM v_today)
          > EXTRACT(MONTH FROM (v_today + INTERVAL '7 days')) * 100 + EXTRACT(DAY FROM (v_today + INTERVAL '7 days'))
          AND (
            EXTRACT(MONTH FROM c.date_of_birth) * 100 + EXTRACT(DAY FROM c.date_of_birth)
            >= EXTRACT(MONTH FROM v_today) * 100 + EXTRACT(DAY FROM v_today)
            OR
            EXTRACT(MONTH FROM c.date_of_birth) * 100 + EXTRACT(DAY FROM c.date_of_birth)
            <= EXTRACT(MONTH FROM (v_today + INTERVAL '7 days')) * 100 + EXTRACT(DAY FROM (v_today + INTERVAL '7 days'))
          )
        )
      )
  LOOP
    v_total_matches := v_total_matches + 1;

    -- Build display name
    v_contact_name := COALESCE(
      NULLIF(TRIM(COALESCE(rec.first_name, '') || ' ' || COALESCE(rec.last_name, '')), ''),
      rec.name,
      'Unknown Contact'
    );

    -- Build this year's birthday date for display
    v_birthday_this_year := make_date(
      EXTRACT(YEAR FROM v_today)::int,
      EXTRACT(MONTH FROM rec.date_of_birth)::int,
      EXTRACT(DAY FROM rec.date_of_birth)::int
    );
    -- If the birthday already passed this year in terms of month/day but we're in a wrap scenario
    IF v_birthday_this_year < v_today THEN
      v_birthday_this_year := make_date(
        (EXTRACT(YEAR FROM v_today) + 1)::int,
        EXTRACT(MONTH FROM rec.date_of_birth)::int,
        EXTRACT(DAY FROM rec.date_of_birth)::int
      );
    END IF;

    v_display_date := TO_CHAR(v_birthday_this_year, 'FMMonth FMDD');

    -- Check for duplicate: same contact + same year + birthday kind
    SELECT COUNT(*) INTO v_existing
    FROM public.notifications n
    WHERE n.user_id = rec.user_id
      AND n.kind = 'birthday_reminder'
      AND n.entity_type = 'contact'
      AND n.entity_id = rec.contact_id
      AND EXTRACT(YEAR FROM n.created_at) = EXTRACT(YEAR FROM v_today);

    IF v_existing > 0 THEN
      v_skipped_dup := v_skipped_dup + 1;
      CONTINUE;
    END IF;

    -- Insert the birthday reminder notification
    INSERT INTO public.notifications (user_id, kind, title, body, entity_type, entity_id)
    VALUES (
      rec.user_id,
      'birthday_reminder',
      'Birthday Reminder',
      format(
        E'\U0001F382 %s\u2019s birthday is on %s \u2014 consider reaching out!',
        v_contact_name,
        v_display_date
      ),
      'contact',
      rec.contact_id
    );

    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'total_birthday_matches', v_total_matches,
    'reminders_created', v_created,
    'skipped_duplicates', v_skipped_dup,
    'check_date', v_today::text,
    'completed_at', now()::text
  );
END;
$$;

COMMENT ON FUNCTION public.generate_birthday_reminders IS
  'Generates birthday reminder notifications for contacts with birthdays in the next 7 days. Runs daily at 7am AEST.';

-- ============================================================================
-- 6. Cron schedules
-- ============================================================================

-- 6a. Nightly lead-score recompute: 2:00 AM AEST = 16:00 UTC
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

-- 6b. Birthday reminders: 7:00 AM AEST = 21:00 UTC (previous day)
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

-- 6c. Notification digest: 7:00 AM and 5:00 PM AEST = 21:00 UTC and 07:00 UTC
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

-- ============================================================================
-- 7. Reload PostgREST schema cache
-- ============================================================================
NOTIFY pgrst, 'reload schema';
