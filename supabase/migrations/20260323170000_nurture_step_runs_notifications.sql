-- Nurture step execution tracking + optional in-app notifications + manual advance RPC

CREATE TABLE IF NOT EXISTS public.nurture_sequence_step_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.nurture_sequence_enrollments(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL CHECK (step_index >= 0),
  step_id UUID REFERENCES public.nurture_sequence_steps(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'failed')),
  task_id UUID REFERENCES public.contact_tasks(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, step_index)
);

CREATE INDEX IF NOT EXISTS idx_nurture_step_runs_enrollment_status
  ON public.nurture_sequence_step_runs(enrollment_id, status);

CREATE INDEX IF NOT EXISTS idx_nurture_step_runs_task_id
  ON public.nurture_sequence_step_runs(task_id);

ALTER TABLE public.nurture_sequence_step_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nurture_sequence_step_runs_all" ON public.nurture_sequence_step_runs;
CREATE POLICY "nurture_sequence_step_runs_all" ON public.nurture_sequence_step_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.nurture_sequence_enrollments e
      WHERE e.id = enrollment_id
        AND e.user_id = auth.uid()
        AND public.user_can_access_contact(e.contact_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.nurture_sequence_enrollments e
      WHERE e.id = enrollment_id
        AND e.user_id = auth.uid()
        AND public.user_can_access_contact(e.contact_id)
    )
  );

DROP TRIGGER IF EXISTS update_nurture_sequence_step_runs_updated_at ON public.nurture_sequence_step_runs;
CREATE TRIGGER update_nurture_sequence_step_runs_updated_at
  BEFORE UPDATE ON public.nurture_sequence_step_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read_at)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP FUNCTION IF EXISTS public.complete_nurture_step_and_advance(UUID, UUID, TEXT);
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
  v_steps_count INTEGER;
  v_next_index INTEGER;
  v_next_step_offset INTEGER;
  v_next_at TIMESTAMPTZ;
  v_completed_at TIMESTAMPTZ;
  v_current_step_index INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_status := CASE
    WHEN lower(coalesce(p_outcome, 'completed')) = 'skip' THEN 'skipped'
    WHEN lower(coalesce(p_outcome, 'completed')) = 'skipped' THEN 'skipped'
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

  UPDATE public.nurture_sequence_step_runs
  SET status = v_status,
      completed_at = now(),
      updated_at = now()
  WHERE id = v_run.id;

  IF v_run.task_id IS NOT NULL THEN
    UPDATE public.contact_tasks
    SET completed_at = COALESCE(completed_at, now())
    WHERE id = v_run.task_id;
  END IF;

  SELECT COUNT(*)
  INTO v_steps_count
  FROM public.nurture_sequence_steps s
  WHERE s.sequence_id = v_enrollment.sequence_id;

  v_next_index := v_enrollment.current_step_index + 1;

  IF v_next_index >= COALESCE(v_steps_count, 0) THEN
    v_completed_at := now();
    v_next_at := NULL;
    v_current_step_index := v_next_index;

    UPDATE public.nurture_sequence_enrollments
    SET current_step_index = v_current_step_index,
        next_step_at = NULL,
        completed_at = v_completed_at,
        updated_at = now()
    WHERE id = v_enrollment.id;
  ELSE
    SELECT s.offset_days
    INTO v_next_step_offset
    FROM public.nurture_sequence_steps s
    WHERE s.sequence_id = v_enrollment.sequence_id
    ORDER BY s.sort_order ASC
    OFFSET v_next_index
    LIMIT 1;

    v_next_at := (v_enrollment.started_at + make_interval(days => COALESCE(v_next_step_offset, 0)));
    v_completed_at := NULL;
    v_current_step_index := v_next_index;

    UPDATE public.nurture_sequence_enrollments
    SET current_step_index = v_current_step_index,
        next_step_at = v_next_at,
        completed_at = NULL,
        updated_at = now()
    WHERE id = v_enrollment.id;
  END IF;

  RETURN QUERY
  SELECT v_enrollment.id, v_run.id, v_next_at, v_completed_at, v_current_step_index;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_nurture_step_and_advance(UUID, UUID, TEXT) TO authenticated;
