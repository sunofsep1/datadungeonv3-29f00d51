-- Audit trail for CRM workflow processor (process-workflows Edge Function).
-- One row per step execution attempt (success, failure, branch decision, or skip).

CREATE TABLE IF NOT EXISTS public.crm_workflow_step_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.crm_workflow_enrollments (id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.crm_workflows (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'branch', 'skipped')),
  detail TEXT,
  branch_taken BOOLEAN,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_workflow_step_runs_workflow_executed
  ON public.crm_workflow_step_runs (workflow_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_workflow_step_runs_enrollment_executed
  ON public.crm_workflow_step_runs (enrollment_id, executed_at DESC);

ALTER TABLE public.crm_workflow_step_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_workflow_step_runs_select ON public.crm_workflow_step_runs;
CREATE POLICY crm_workflow_step_runs_select ON public.crm_workflow_step_runs
  FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.crm_workflow_step_runs IS
  'Append-only style log of workflow step executions from process-workflows (service role inserts; users read via RLS).';

NOTIFY pgrst, 'reload schema';
