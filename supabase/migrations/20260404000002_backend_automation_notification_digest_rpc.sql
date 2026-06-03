-- Backend Automation: System-level Notification Digest RPC
--
-- Creates run_notification_digest_system() which compiles unread notifications
-- for all users and inserts a digest summary notification for each user
-- who has unread notifications.
--
-- This is the system-level counterpart that can be called by a cron-triggered
-- Edge Function with service_role, unlike the per-user function which requires auth.
--
-- IMPORTANT: Run in Supabase SQL Editor. Do NOT run via migrations CLI.

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
  v_unread_count INTEGER;
  v_kind_summary TEXT;
BEGIN
  -- Loop through all users who have unread notifications
  FOR v_user IN
    SELECT DISTINCT n.user_id
    FROM public.notifications n
    WHERE n.read_at IS NULL
      AND n.kind != 'notification_digest' -- Don't count previous digests
  LOOP
    v_processed := v_processed + 1;

    -- Count unread notifications for this user
    SELECT COUNT(*)
    INTO v_unread_count
    FROM public.notifications n
    WHERE n.user_id = v_user.user_id
      AND n.read_at IS NULL
      AND n.kind != 'notification_digest';

    IF v_unread_count = 0 THEN
      CONTINUE;
    END IF;

    -- Build a summary by kind
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
        AND n.kind != 'notification_digest'
      GROUP BY n.kind
    ) sub;

    -- Insert digest notification
    INSERT INTO public.notifications (user_id, kind, title, body, entity_type, entity_id)
    VALUES (
      v_user.user_id,
      'notification_digest',
      'Notification digest: ' || v_unread_count || ' unread',
      'You have ' || v_unread_count || ' unread notification'
        || CASE WHEN v_unread_count != 1 THEN 's' ELSE '' END
        || ': ' || v_kind_summary || '.',
      NULL,
      NULL
    );

    v_digests := v_digests + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'users_processed', v_processed,
    'digests_created', v_digests,
    'timestamp', now()::text
  );
END;
$$;

-- Allow the function to be called via supabase.rpc() with service role
GRANT EXECUTE ON FUNCTION public.run_notification_digest_system() TO service_role;

-- Also create the user-scoped version for client-side use
CREATE OR REPLACE FUNCTION public.run_notification_digest_for_current_user()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_unread_count INTEGER;
  v_kind_summary TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Count unread notifications
  SELECT COUNT(*)
  INTO v_unread_count
  FROM public.notifications n
  WHERE n.user_id = v_uid
    AND n.read_at IS NULL
    AND n.kind != 'notification_digest';

  IF v_unread_count = 0 THEN
    RETURN jsonb_build_object(
      'unread_count', 0,
      'digest_created', false,
      'timestamp', now()::text
    );
  END IF;

  -- Build summary
  SELECT string_agg(
    cnt || ' ' || replace(kind, '_', ' '),
    ', '
    ORDER BY cnt DESC
  )
  INTO v_kind_summary
  FROM (
    SELECT n.kind, COUNT(*) AS cnt
    FROM public.notifications n
    WHERE n.user_id = v_uid
      AND n.read_at IS NULL
      AND n.kind != 'notification_digest'
    GROUP BY n.kind
  ) sub;

  -- Insert digest
  INSERT INTO public.notifications (user_id, kind, title, body)
  VALUES (
    v_uid,
    'notification_digest',
    'Notification digest: ' || v_unread_count || ' unread',
    'You have ' || v_unread_count || ' unread notification'
      || CASE WHEN v_unread_count != 1 THEN 's' ELSE '' END
      || ': ' || v_kind_summary || '.'
  );

  RETURN jsonb_build_object(
    'unread_count', v_unread_count,
    'digest_created', true,
    'timestamp', now()::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_notification_digest_for_current_user() TO authenticated;

NOTIFY pgrst, 'reload schema';
