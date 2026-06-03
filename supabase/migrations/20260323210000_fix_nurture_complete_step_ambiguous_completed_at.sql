-- Fix RPC error: "column reference 'completed_at' is ambiguous"
-- in complete_nurture_step_and_advance.

CREATE OR REPLACE FUNCTION public.complete_nurture_step_and_advance(
  p_enrollment_id UUID,
  p_step_run_id UUID,
  p_outcome TEXT DEFAULT 'completed'
)
RETURNS TABLE (
  enrollment_id UUID,
  step_run_id UUID,
  next_step_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  current_step_index INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment public.nurture_sequence_enrollments%ROWTYPE;
  v_run public.nurture_sequence_step_runs%ROWTYPE;
  v_status TEXT;
  v_next_index INTEGER;
  v_next_step_id UUID;
  v_next_offset_days INTEGER;
  v_next_step_type TEXT;
  v_next_title TEXT;
  v_next_body TEXT;
  v_next_at TIMESTAMPTZ;
  v_completed_at TIMESTAMPTZ;

  v_next_step_run_id UUID;
  v_next_task_id UUID;
  v_created_task_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_status := CASE
    WHEN lower(coalesce(p_outcome, 'completed')) IN ('skip', 'skipped') THEN 'skipped'
    ELSE 'completed'
  END;

  SELECT *
  INTO v_enrollment
  FROM public.nurture_sequence_enrollments e
  WHERE e.id = p_enrollment_id
    AND e.user_id = auth.uid()
    AND public.user_can_access_contact(e.contact_id)
    AND e.completed_at IS NULL
  LIMIT 1;

  IF v_enrollment.id IS NULL THEN
    RAISE EXCEPTION 'Enrollment not found or not accessible';
  END IF;

  SELECT *
  INTO v_run
  FROM public.nurture_sequence_step_runs r
  WHERE r.id = p_step_run_id
    AND r.enrollment_id = v_enrollment.id
    AND r.step_index = v_enrollment.current_step_index
  LIMIT 1;

  IF v_run.id IS NULL THEN
    RAISE EXCEPTION 'Active step run not found for this enrollment';
  END IF;

  IF v_run.status IN ('completed', 'skipped') THEN
    RAISE EXCEPTION 'Step is already finalized';
  END IF;

  UPDATE public.nurture_sequence_step_runs rs
  SET status = v_status,
      completed_at = now(),
      updated_at = now()
  WHERE rs.id = v_run.id;

  IF v_run.task_id IS NOT NULL THEN
    UPDATE public.contact_tasks t
    SET completed_at = COALESCE(t.completed_at, now())
    WHERE t.id = v_run.task_id;
  END IF;

  v_next_index := v_enrollment.current_step_index + 1;

  SELECT
    s.id,
    s.offset_days,
    s.step_type,
    s.title,
    s.body
  INTO
    v_next_step_id,
    v_next_offset_days,
    v_next_step_type,
    v_next_title,
    v_next_body
  FROM public.nurture_sequence_steps s
  WHERE s.sequence_id = v_enrollment.sequence_id
  ORDER BY s.sort_order ASC
  OFFSET v_next_index
  LIMIT 1;

  IF v_next_step_id IS NULL THEN
    v_completed_at := now();
    v_next_at := NULL;

    UPDATE public.nurture_sequence_enrollments e
    SET current_step_index = v_next_index,
        next_step_at = NULL,
        completed_at = v_completed_at,
        updated_at = now()
    WHERE e.id = v_enrollment.id;

    RETURN QUERY
    SELECT v_enrollment.id, v_run.id, v_next_at, v_completed_at, v_next_index;
  END IF;

  v_next_at := v_enrollment.started_at + make_interval(days => COALESCE(v_next_offset_days, 0));

  UPDATE public.nurture_sequence_enrollments e
  SET current_step_index = v_next_index,
      next_step_at = v_next_at,
      completed_at = NULL,
      updated_at = now()
  WHERE e.id = v_enrollment.id;

  IF v_next_step_type IN ('task', 'prompt') THEN
    SELECT r.id, r.task_id
    INTO v_next_step_run_id, v_next_task_id
    FROM public.nurture_sequence_step_runs r
    WHERE r.enrollment_id = v_enrollment.id
      AND r.step_index = v_next_index
    LIMIT 1;

    IF v_next_step_run_id IS NULL THEN
      INSERT INTO public.contact_tasks (contact_id, user_id, title, notes, due_at, sequence_enrollment_id)
      VALUES (v_enrollment.contact_id, auth.uid(), v_next_title, v_next_body, v_next_at, v_enrollment.id)
      RETURNING id INTO v_created_task_id;

      INSERT INTO public.nurture_sequence_step_runs (enrollment_id, step_index, step_id, status, task_id, activated_at)
      VALUES (v_enrollment.id, v_next_index, v_next_step_id, 'pending', v_created_task_id, now())
      RETURNING id INTO v_next_step_run_id;
    ELSIF v_next_task_id IS NULL THEN
      INSERT INTO public.contact_tasks (contact_id, user_id, title, notes, due_at, sequence_enrollment_id)
      VALUES (v_enrollment.contact_id, auth.uid(), v_next_title, v_next_body, v_next_at, v_enrollment.id)
      RETURNING id INTO v_created_task_id;

      UPDATE public.nurture_sequence_step_runs r
      SET task_id = v_created_task_id,
          step_id = v_next_step_id,
          status = 'pending',
          completed_at = NULL,
          error = NULL,
          activated_at = now(),
          updated_at = now()
      WHERE r.id = v_next_step_run_id;
    END IF;

    IF (v_enrollment.pause_followup_cadence IS FALSE) AND v_next_at <= now() THEN
      INSERT INTO public.notifications (user_id, kind, title, body, entity_type, entity_id, read_at)
      SELECT
        v_enrollment.user_id,
        'nurture_step_due',
        v_next_title,
        'Sequence step is due now.',
        'nurture_sequence_step_runs',
        v_next_step_run_id,
        NULL
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = v_enrollment.user_id
          AND n.kind = 'nurture_step_due'
          AND n.entity_type = 'nurture_sequence_step_runs'
          AND n.entity_id = v_next_step_run_id
      );
    END IF;
  END IF;

  RETURN QUERY
  SELECT v_enrollment.id, v_run.id, v_next_at, v_completed_at, v_next_index;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_nurture_step_and_advance(UUID, UUID, TEXT) TO authenticated;

