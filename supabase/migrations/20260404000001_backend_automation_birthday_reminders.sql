-- Backend Automation: Birthday Reminders
--
-- 1. Adds date_of_birth column to contacts table
-- 2. Creates generate_birthday_reminders() Postgres function that:
--    - Finds contacts with birthdays in the next 7 days
--    - Inserts notification for each match (avoids duplicates per year)
--
-- IMPORTANT: Run in Supabase SQL Editor. Do NOT run via migrations CLI.

-- Add date_of_birth column
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Create the birthday reminders function
CREATE OR REPLACE FUNCTION public.generate_birthday_reminders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact RECORD;
  v_created INTEGER := 0;
  v_skipped INTEGER := 0;
  v_total INTEGER := 0;
  v_birthday_this_year DATE;
  v_today DATE := CURRENT_DATE;
  v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_existing_count INTEGER;
BEGIN
  -- Find contacts whose birthday (month+day) falls within the next 7 days.
  -- We compare against the current year's occurrence of that birthday.
  FOR v_contact IN
    SELECT
      c.id AS contact_id,
      c.user_id,
      c.owner_id,
      COALESCE(c.first_name || ' ' || c.last_name, c.first_name, c.last_name, 'Contact') AS contact_name,
      c.date_of_birth,
      -- Build this year's birthday date
      make_date(
        v_year,
        EXTRACT(MONTH FROM c.date_of_birth)::INTEGER,
        -- Handle Feb 29 in non-leap years -> Feb 28
        LEAST(
          EXTRACT(DAY FROM c.date_of_birth)::INTEGER,
          CASE
            WHEN EXTRACT(MONTH FROM c.date_of_birth)::INTEGER = 2
              AND NOT (v_year % 4 = 0 AND (v_year % 100 != 0 OR v_year % 400 = 0))
            THEN 28
            ELSE EXTRACT(DAY FROM c.date_of_birth)::INTEGER
          END
        )
      ) AS birthday_this_year
    FROM public.contacts c
    WHERE c.date_of_birth IS NOT NULL
      AND c.do_not_contact IS NOT TRUE
  LOOP
    v_birthday_this_year := v_contact.birthday_this_year;

    -- Check if the birthday falls within the next 7 days (inclusive of today)
    IF v_birthday_this_year >= v_today AND v_birthday_this_year <= v_today + INTERVAL '7 days' THEN
      v_total := v_total + 1;

      -- Determine the user_id to notify (prefer user_id, fallback to owner_id)
      DECLARE
        v_notify_user UUID := COALESCE(v_contact.user_id, v_contact.owner_id);
      BEGIN
        IF v_notify_user IS NULL THEN
          v_skipped := v_skipped + 1;
          CONTINUE;
        END IF;

        -- Check for existing birthday notification this year for this contact
        SELECT COUNT(*)
        INTO v_existing_count
        FROM public.notifications n
        WHERE n.user_id = v_notify_user
          AND n.kind = 'birthday_reminder'
          AND n.entity_type = 'contact'
          AND n.entity_id = v_contact.contact_id
          AND n.created_at >= make_date(v_year, 1, 1)::timestamptz
          AND n.created_at < make_date(v_year + 1, 1, 1)::timestamptz;

        IF v_existing_count > 0 THEN
          v_skipped := v_skipped + 1;
          CONTINUE;
        END IF;

        -- Insert the birthday reminder notification
        INSERT INTO public.notifications (user_id, kind, title, body, entity_type, entity_id)
        VALUES (
          v_notify_user,
          'birthday_reminder',
          '🎂 ' || v_contact.contact_name || '''s birthday is coming up!',
          '🎂 ' || v_contact.contact_name || '''s birthday is on '
            || to_char(v_birthday_this_year, 'FMMonth FMDDth')
            || ' — consider reaching out!',
          'contact',
          v_contact.contact_id
        );

        v_created := v_created + 1;
      END;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'birthdays_found', v_total,
    'reminders_created', v_created,
    'duplicates_skipped', v_skipped,
    'timestamp', now()::text
  );
END;
$$;

-- Allow the function to be called via supabase.rpc() with service role
GRANT EXECUTE ON FUNCTION public.generate_birthday_reminders() TO service_role;

NOTIFY pgrst, 'reload schema';
