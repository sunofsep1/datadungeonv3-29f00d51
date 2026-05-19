-- Align recalculate_all_contact_scores_system() with src/lib/contactUrgency.ts:
-- replace 48h "due soon" with 30 / 60 / 90 day future task bands.

CREATE OR REPLACE FUNCTION public.recalculate_all_contact_scores_system()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact RECORD;
  v_score INTEGER;
  v_tier TEXT;
  v_updated INTEGER := 0;
  v_total INTEGER := 0;
  v_overdue INTEGER;
  v_due_today INTEGER;
  v_due_30 INTEGER;
  v_due_60 INTEGER;
  v_due_90 INTEGER;
  v_sequence_due INTEGER;
  v_appt_within_24h BOOLEAN;
  v_appt_within_72h BOOLEAN;
  v_inactive_days NUMERIC;
BEGIN
  FOR v_contact IN
    SELECT c.id, c.user_id, c.owner_id, c.category, c.last_activity_at
    FROM public.contacts c
    WHERE c.do_not_contact IS NOT TRUE
  LOOP
    v_total := v_total + 1;
    v_score := 0;

    SELECT COUNT(*)
    INTO v_overdue
    FROM public.contact_tasks t
    WHERE t.contact_id = v_contact.id
      AND t.completed_at IS NULL
      AND t.due_at IS NOT NULL
      AND t.due_at < date_trunc('day', now())
    ;

    IF v_overdue > 0 THEN
      v_score := v_score + 120 + LEAST(v_overdue * 10, 30);
    END IF;

    SELECT COUNT(*)
    INTO v_due_today
    FROM public.contact_tasks t
    WHERE t.contact_id = v_contact.id
      AND t.completed_at IS NULL
      AND t.due_at IS NOT NULL
      AND t.due_at >= date_trunc('day', now())
      AND t.due_at < date_trunc('day', now()) + INTERVAL '1 day'
    ;

    IF v_due_today > 0 THEN
      v_score := v_score + 70 + LEAST(v_due_today * 8, 24);
    END IF;

    -- Future tasks in (0, 720h], excluding calendar today (matches TS !isToday + 30d band)
    SELECT COUNT(*)
    INTO v_due_30
    FROM public.contact_tasks t
    WHERE t.contact_id = v_contact.id
      AND t.completed_at IS NULL
      AND t.due_at IS NOT NULL
      AND t.due_at > now()
      AND t.due_at <= now() + INTERVAL '720 hours'
      AND t.due_at >= date_trunc('day', now()) + INTERVAL '1 day'
    ;

    IF v_due_30 > 0 THEN
      v_score := v_score + 85 + LEAST(v_due_30 * 5, 15);
    END IF;

    SELECT COUNT(*)
    INTO v_due_60
    FROM public.contact_tasks t
    WHERE t.contact_id = v_contact.id
      AND t.completed_at IS NULL
      AND t.due_at IS NOT NULL
      AND t.due_at > now() + INTERVAL '720 hours'
      AND t.due_at <= now() + INTERVAL '1440 hours'
    ;

    IF v_due_60 > 0 THEN
      v_score := v_score + 55 + LEAST(v_due_60 * 4, 12);
    END IF;

    SELECT COUNT(*)
    INTO v_due_90
    FROM public.contact_tasks t
    WHERE t.contact_id = v_contact.id
      AND t.completed_at IS NULL
      AND t.due_at IS NOT NULL
      AND t.due_at > now() + INTERVAL '1440 hours'
      AND t.due_at <= now() + INTERVAL '2160 hours'
    ;

    IF v_due_90 > 0 THEN
      v_score := v_score + 38 + LEAST(v_due_90 * 3, 9);
    END IF;

    SELECT COUNT(*)
    INTO v_sequence_due
    FROM public.nurture_sequence_enrollments e
    WHERE e.contact_id = v_contact.id
      AND e.completed_at IS NULL
      AND e.next_step_at IS NOT NULL
      AND e.next_step_at <= now() + INTERVAL '24 hours'
    ;

    IF v_sequence_due > 0 THEN
      v_score := v_score + 40 + LEAST(v_sequence_due * 6, 18);
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.contact_id = v_contact.id
        AND a.start_time > now() - INTERVAL '2 hours'
        AND a.start_time <= now() + INTERVAL '24 hours'
    ) INTO v_appt_within_24h;

    IF v_appt_within_24h THEN
      v_score := v_score + 55;
    ELSE
      SELECT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.contact_id = v_contact.id
          AND a.start_time > now() + INTERVAL '24 hours'
          AND a.start_time <= now() + INTERVAL '72 hours'
      ) INTO v_appt_within_72h;

      IF v_appt_within_72h THEN
        v_score := v_score + 30;
      END IF;
    END IF;

    IF v_contact.last_activity_at IS NOT NULL THEN
      v_inactive_days := EXTRACT(EPOCH FROM (now() - v_contact.last_activity_at)) / 86400.0;
      IF v_inactive_days >= 30 THEN
        v_score := v_score + 28;
      ELSIF v_inactive_days >= 14 THEN
        v_score := v_score + 16;
      END IF;
    END IF;

    IF v_score >= 130 THEN
      v_tier := 'immediate';
    ELSIF v_score >= 80 THEN
      v_tier := 'priority';
    ELSIF v_score >= 35 THEN
      v_tier := 'planned';
    ELSE
      v_tier := 'backlog';
    END IF;

    IF v_contact.category IS DISTINCT FROM v_tier THEN
      UPDATE public.contacts
      SET category = v_tier,
          updated_at = now()
      WHERE id = v_contact.id;
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'total_contacts', v_total,
    'updated', v_updated,
    'timestamp', now()::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_all_contact_scores_system() TO service_role;

NOTIFY pgrst, 'reload schema';
