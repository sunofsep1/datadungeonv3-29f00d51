-- Fix touches row from interactions when both logged_by and user_id exist (user_id was null).
-- Deduplicate notification digests: update existing unread digest instead of stacking inserts.

CREATE OR REPLACE FUNCTION public.log_touch_from_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mapped_touch_type TEXT;
  v_actor UUID;
  c_logged_by BOOLEAN;
  c_user_id BOOLEAN;
BEGIN
  v_actor := COALESCE(NEW.user_id, auth.uid());
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'log_touch_from_interaction: missing user (interaction.user_id and auth.uid() are null)';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'touches' AND column_name = 'logged_by'
  ) INTO c_logged_by;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'touches' AND column_name = 'user_id'
  ) INTO c_user_id;

  mapped_touch_type := CASE lower(COALESCE(NEW.type, ''))
    WHEN 'call' THEN 'call'
    WHEN 'email' THEN 'email'
    WHEN 'sms' THEN 'sms'
    ELSE 'other'
  END;

  IF c_logged_by AND c_user_id THEN
    INSERT INTO public.touches (
      contact_id,
      touch_type,
      notes,
      logged_by,
      user_id,
      touch_date
    )
    VALUES (
      NEW.contact_id,
      mapped_touch_type,
      COALESCE(NEW.subject, NEW.body),
      v_actor,
      v_actor,
      COALESCE(NEW.timestamp, NEW.created_at, NOW())
    );
  ELSIF c_logged_by THEN
    INSERT INTO public.touches (
      contact_id,
      touch_type,
      notes,
      logged_by,
      touch_date
    )
    VALUES (
      NEW.contact_id,
      mapped_touch_type,
      COALESCE(NEW.subject, NEW.body),
      v_actor,
      COALESCE(NEW.timestamp, NEW.created_at, NOW())
    );
  ELSIF c_user_id THEN
    INSERT INTO public.touches (
      contact_id,
      touch_type,
      notes,
      user_id,
      touch_date
    )
    VALUES (
      NEW.contact_id,
      mapped_touch_type,
      COALESCE(NEW.subject, NEW.body),
      v_actor,
      COALESCE(NEW.timestamp, NEW.created_at, NOW())
    );
  ELSE
    RAISE EXCEPTION 'log_touch_from_interaction: touches has neither logged_by nor user_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_notification_digest_system()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_processed INTEGER := 0;
  v_digests INTEGER := 0;
  v_updated INTEGER := 0;
  v_unread_count INTEGER;
  v_kind_summary TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  FOR v_user IN
    SELECT DISTINCT n.user_id
    FROM public.notifications n
    WHERE n.read_at IS NULL
      AND n.kind <> 'notification_digest'
  LOOP
    v_processed := v_processed + 1;

    SELECT COUNT(*)
    INTO v_unread_count
    FROM public.notifications n
    WHERE n.user_id = v_user.user_id
      AND n.read_at IS NULL
      AND n.kind <> 'notification_digest';

    IF v_unread_count = 0 THEN
      CONTINUE;
    END IF;

    SELECT string_agg(
      cnt || ' ' || replace(kind, '_', ' '),
      ', '
      ORDER BY cnt DESC
    )
    INTO v_kind_summary
    FROM (
      SELECT n.kind, COUNT(*) AS cnt
      FROM public.notifications n
      WHERE n.user_id = v_user.user_id
        AND n.read_at IS NULL
        AND n.kind <> 'notification_digest'
      GROUP BY n.kind
    ) sub;

    v_title := 'Notification digest: ' || v_unread_count || ' unread';
    v_body := 'You have ' || v_unread_count || ' unread notification'
      || CASE WHEN v_unread_count <> 1 THEN 's' ELSE '' END
      || ': ' || v_kind_summary || '.';

    UPDATE public.notifications n
    SET
      title = v_title,
      body = v_body,
      created_at = NOW()
    WHERE n.user_id = v_user.user_id
      AND n.kind = 'notification_digest'
      AND n.read_at IS NULL;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated = 0 THEN
      INSERT INTO public.notifications (user_id, kind, title, body, entity_type, entity_id)
      VALUES (
        v_user.user_id,
        'notification_digest',
        v_title,
        v_body,
        NULL,
        NULL
      );
    END IF;

    v_digests := v_digests + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'users_processed', v_processed,
    'digests_created_or_updated', v_digests,
    'timestamp', now()::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_notification_digest_system() TO service_role;
