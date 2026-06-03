-- CRM workflow engine: definitions, linear steps, enrollments (backend upgrade §3)
-- Processor: Edge Function process-workflows (service role, cron every 5 min recommended).

CREATE TABLE IF NOT EXISTS public.crm_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN (
      'manual',
      'contact_property_change',
      'listing_stage_change',
      'form_submission',
      'date_based',
      'score_threshold'
    )),
  trigger_object TEXT NOT NULL DEFAULT 'contact'
    CHECK (trigger_object IN ('contact', 'listing')),
  trigger_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  enrollment_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_workflows_user_active
  ON public.crm_workflows (user_id, is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_workflow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.crm_workflows (id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL CHECK (step_order >= 0),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'noop',
    'wait_delay',
    'create_task',
    'notify_user',
    'update_contact',
    'add_to_sequence',
    'send_sms',
    'send_email'
  )),
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0 AND delay_minutes <= 525600),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_crm_workflow_steps_workflow
  ON public.crm_workflow_steps (workflow_id, step_order);

CREATE TABLE IF NOT EXISTS public.crm_workflow_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.crm_workflows (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts (id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings (id) ON DELETE CASCADE,
  current_step_order INTEGER NOT NULL DEFAULT 0 CHECK (current_step_order >= 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_action_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (
    (contact_id IS NOT NULL AND listing_id IS NULL)
    OR (contact_id IS NULL AND listing_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_crm_workflow_enrollments_due
  ON public.crm_workflow_enrollments (status, next_action_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_crm_workflow_enrollments_user
  ON public.crm_workflow_enrollments (user_id, status, enrolled_at DESC);

DROP TRIGGER IF EXISTS trg_crm_workflows_updated_at ON public.crm_workflows;
CREATE TRIGGER trg_crm_workflows_updated_at
  BEFORE UPDATE ON public.crm_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.crm_workflow_enrollment_count_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.crm_workflows
    SET enrollment_count = enrollment_count + 1, updated_at = now()
    WHERE id = NEW.workflow_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.crm_workflows
    SET enrollment_count = GREATEST(0, enrollment_count - 1), updated_at = now()
    WHERE id = OLD.workflow_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_enrollment_count ON public.crm_workflow_enrollments;
CREATE TRIGGER trg_crm_enrollment_count
  AFTER INSERT OR DELETE ON public.crm_workflow_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.crm_workflow_enrollment_count_sync();

ALTER TABLE public.crm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_workflows_select ON public.crm_workflows;
CREATE POLICY crm_workflows_select ON public.crm_workflows
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS crm_workflows_insert ON public.crm_workflows;
CREATE POLICY crm_workflows_insert ON public.crm_workflows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS crm_workflows_update ON public.crm_workflows;
CREATE POLICY crm_workflows_update ON public.crm_workflows
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS crm_workflows_delete ON public.crm_workflows;
CREATE POLICY crm_workflows_delete ON public.crm_workflows
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS crm_workflow_steps_all ON public.crm_workflow_steps;
CREATE POLICY crm_workflow_steps_all ON public.crm_workflow_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.crm_workflows w
      WHERE w.id = workflow_id AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crm_workflows w
      WHERE w.id = workflow_id AND w.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS crm_workflow_enrollments_select ON public.crm_workflow_enrollments;
CREATE POLICY crm_workflow_enrollments_select ON public.crm_workflow_enrollments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS crm_workflow_enrollments_insert ON public.crm_workflow_enrollments;
CREATE POLICY crm_workflow_enrollments_insert ON public.crm_workflow_enrollments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.crm_workflows w WHERE w.id = workflow_id AND w.user_id = auth.uid())
    AND (
      contact_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.contacts c
        WHERE c.id = contact_id AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
      )
    )
    AND (
      listing_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.listings l
        WHERE l.id = listing_id AND l.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS crm_workflow_enrollments_update ON public.crm_workflow_enrollments;
CREATE POLICY crm_workflow_enrollments_update ON public.crm_workflow_enrollments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS crm_workflow_enrollments_delete ON public.crm_workflow_enrollments;
CREATE POLICY crm_workflow_enrollments_delete ON public.crm_workflow_enrollments
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.crm_workflows IS 'User-defined automation definitions; processed by process-workflows Edge Function.';
COMMENT ON TABLE public.crm_workflow_steps IS 'Ordered steps; delay_minutes applies before executing this step action.';
COMMENT ON TABLE public.crm_workflow_enrollments IS 'Active run of a workflow for one contact or one listing.';

-- Optional pg_cron (run in SQL Editor like backend_automation_cron_schedules.sql):
-- Schedule POST .../functions/v1/process-workflows every 5 minutes with service_role Bearer.
