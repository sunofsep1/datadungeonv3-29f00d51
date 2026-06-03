-- Archive and retention support for nurture artifacts.

-- Helpful indexes for archive/history queries.
CREATE INDEX IF NOT EXISTS idx_nurture_enrollments_completed_at
  ON public.nurture_sequence_enrollments(completed_at)
  WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_step_runs_completed_at
  ON public.nurture_sequence_step_runs(completed_at)
  WHERE completed_at IS NOT NULL;

-- Archive views (read models) for completed artifacts.
CREATE OR REPLACE VIEW public.nurture_archived_enrollments AS
SELECT
  e.id,
  e.user_id,
  e.contact_id,
  e.sequence_id,
  e.started_at,
  e.completed_at,
  e.updated_at
FROM public.nurture_sequence_enrollments e
WHERE e.completed_at IS NOT NULL;

CREATE OR REPLACE VIEW public.nurture_archived_step_runs AS
SELECT
  r.id,
  e.user_id,
  r.enrollment_id,
  r.step_index,
  r.step_id,
  r.status,
  r.task_id,
  r.activated_at,
  r.completed_at,
  r.error
FROM public.nurture_sequence_step_runs r
JOIN public.nurture_sequence_enrollments e ON e.id = r.enrollment_id
WHERE e.completed_at IS NOT NULL;

-- Retention helper for notifications.
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(days_old integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.notifications n
  WHERE n.created_at < (now() - make_interval(days => GREATEST(days_old, 1)))
    AND (n.read_at IS NOT NULL OR n.kind = 'nurture_step_due');

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications(integer) TO authenticated;

