-- Reapit-style Activity Schedules (P1): templated follow-up sequences on listings or contacts.

CREATE TABLE IF NOT EXISTS public.activity_schedule_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('listing', 'contact')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_schedule_templates_user
  ON public.activity_schedule_templates(user_id, applies_to, name);

CREATE TABLE IF NOT EXISTS public.activity_schedule_template_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.activity_schedule_templates(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  offset_days INTEGER NOT NULL DEFAULT 0 CHECK (offset_days >= 0 AND offset_days <= 3650),
  step_type TEXT NOT NULL DEFAULT 'task'
    CHECK (step_type IN ('task', 'note', 'call', 'email')),
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_schedule_template_steps_template
  ON public.activity_schedule_template_steps(template_id, sort_order);

CREATE TABLE IF NOT EXISTS public.activity_schedule_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.activity_schedule_templates(id) ON DELETE RESTRICT,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('listing', 'contact')),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (applies_to = 'contact' AND contact_id IS NOT NULL AND listing_id IS NULL)
    OR (applies_to = 'listing' AND listing_id IS NOT NULL AND contact_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_activity_schedule_instances_contact
  ON public.activity_schedule_instances(contact_id, applied_at DESC)
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_schedule_instances_listing
  ON public.activity_schedule_instances(listing_id, applied_at DESC)
  WHERE listing_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.activity_schedule_step_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.activity_schedule_instances(id) ON DELETE CASCADE,
  template_step_id UUID REFERENCES public.activity_schedule_template_steps(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  step_type TEXT NOT NULL DEFAULT 'task'
    CHECK (step_type IN ('task', 'note', 'call', 'email')),
  title TEXT NOT NULL,
  body TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  contact_task_id UUID REFERENCES public.contact_tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_schedule_step_runs_instance
  ON public.activity_schedule_step_runs(instance_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_activity_schedule_step_runs_due
  ON public.activity_schedule_step_runs(due_at)
  WHERE completed_at IS NULL;

ALTER TABLE public.activity_schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_schedule_template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_schedule_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_schedule_step_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_schedule_templates_all ON public.activity_schedule_templates;
CREATE POLICY activity_schedule_templates_all ON public.activity_schedule_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS activity_schedule_template_steps_all ON public.activity_schedule_template_steps;
CREATE POLICY activity_schedule_template_steps_all ON public.activity_schedule_template_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.activity_schedule_templates t
      WHERE t.id = template_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.activity_schedule_templates t
      WHERE t.id = template_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS activity_schedule_instances_all ON public.activity_schedule_instances;
CREATE POLICY activity_schedule_instances_all ON public.activity_schedule_instances
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS activity_schedule_step_runs_all ON public.activity_schedule_step_runs;
CREATE POLICY activity_schedule_step_runs_all ON public.activity_schedule_step_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.activity_schedule_instances i
      WHERE i.id = instance_id AND i.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.activity_schedule_instances i
      WHERE i.id = instance_id AND i.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS update_activity_schedule_templates_updated_at ON public.activity_schedule_templates;
CREATE TRIGGER update_activity_schedule_templates_updated_at
  BEFORE UPDATE ON public.activity_schedule_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_activity_schedule_instances_updated_at ON public.activity_schedule_instances;
CREATE TRIGGER update_activity_schedule_instances_updated_at
  BEFORE UPDATE ON public.activity_schedule_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Apply a template: materialize step runs (+ contact tasks when applicable).
CREATE OR REPLACE FUNCTION public.apply_activity_schedule(
  p_template_id UUID,
  p_contact_id UUID DEFAULT NULL,
  p_listing_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_tpl public.activity_schedule_templates%ROWTYPE;
  v_instance_id UUID;
  v_applied_at TIMESTAMPTZ := now();
  v_vendor_contact UUID;
  v_step RECORD;
  v_due_at TIMESTAMPTZ;
  v_task_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_tpl
  FROM public.activity_schedule_templates
  WHERE id = p_template_id AND user_id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule template not found';
  END IF;

  IF v_tpl.applies_to = 'contact' THEN
    IF p_contact_id IS NULL OR p_listing_id IS NOT NULL THEN
      RAISE EXCEPTION 'contact_id required for contact schedules';
    END IF;
    IF NOT public.user_can_access_contact(p_contact_id) THEN
      RAISE EXCEPTION 'Cannot access contact';
    END IF;
  ELSE
    IF p_listing_id IS NULL OR p_contact_id IS NOT NULL THEN
      RAISE EXCEPTION 'listing_id required for listing schedules';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = p_listing_id AND l.user_id = v_user
    ) THEN
      RAISE EXCEPTION 'Cannot access listing';
    END IF;
    SELECT l.contact_id INTO v_vendor_contact
    FROM public.listing_contact_links l
    WHERE l.listing_id = p_listing_id AND l.role = 'vendor'
    ORDER BY l.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  INSERT INTO public.activity_schedule_instances (
    user_id, template_id, applies_to, contact_id, listing_id, applied_at, status
  ) VALUES (
    v_user,
    p_template_id,
    v_tpl.applies_to,
    p_contact_id,
    p_listing_id,
    v_applied_at,
    'active'
  )
  RETURNING id INTO v_instance_id;

  FOR v_step IN
    SELECT *
    FROM public.activity_schedule_template_steps
    WHERE template_id = p_template_id
    ORDER BY sort_order ASC, created_at ASC
  LOOP
    v_due_at := v_applied_at + make_interval(days => v_step.offset_days);
    v_task_id := NULL;

    IF v_step.step_type IN ('task', 'call') THEN
      IF v_tpl.applies_to = 'contact' AND p_contact_id IS NOT NULL THEN
        INSERT INTO public.contact_tasks (contact_id, user_id, title, notes, due_at)
        VALUES (
          p_contact_id,
          v_user,
          v_step.title,
          NULLIF(trim(COALESCE(v_step.body, '')), ''),
          v_due_at
        )
        RETURNING id INTO v_task_id;
      ELSIF v_tpl.applies_to = 'listing' AND v_vendor_contact IS NOT NULL THEN
        INSERT INTO public.contact_tasks (contact_id, user_id, title, notes, due_at)
        VALUES (
          v_vendor_contact,
          v_user,
          v_step.title,
          NULLIF(trim(COALESCE(v_step.body, '') || ' [Listing schedule]'), ''),
          v_due_at
        )
        RETURNING id INTO v_task_id;
      END IF;
    END IF;

    INSERT INTO public.activity_schedule_step_runs (
      instance_id,
      template_step_id,
      sort_order,
      step_type,
      title,
      body,
      due_at,
      contact_task_id
    ) VALUES (
      v_instance_id,
      v_step.id,
      v_step.sort_order,
      v_step.step_type,
      v_step.title,
      v_step.body,
      v_due_at,
      v_task_id
    );
  END LOOP;

  RETURN v_instance_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_activity_schedule(UUID, UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_activity_schedule_step(p_step_run_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_run public.activity_schedule_step_runs%ROWTYPE;
  v_instance public.activity_schedule_instances%ROWTYPE;
  v_open INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.* INTO v_run
  FROM public.activity_schedule_step_runs r
  JOIN public.activity_schedule_instances i ON i.id = r.instance_id
  WHERE r.id = p_step_run_id AND i.user_id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Step not found';
  END IF;

  IF v_run.completed_at IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE public.activity_schedule_step_runs
  SET completed_at = now()
  WHERE id = p_step_run_id;

  IF v_run.contact_task_id IS NOT NULL THEN
    UPDATE public.contact_tasks
    SET completed_at = now(), updated_at = now()
    WHERE id = v_run.contact_task_id AND user_id = v_user AND completed_at IS NULL;
  END IF;

  SELECT * INTO v_instance FROM public.activity_schedule_instances WHERE id = v_run.instance_id;

  SELECT COUNT(*)::INTEGER INTO v_open
  FROM public.activity_schedule_step_runs
  WHERE instance_id = v_run.instance_id AND completed_at IS NULL;

  IF v_open = 0 AND v_instance.status = 'active' THEN
    UPDATE public.activity_schedule_instances
    SET status = 'completed', updated_at = now()
    WHERE id = v_run.instance_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_activity_schedule_step(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
