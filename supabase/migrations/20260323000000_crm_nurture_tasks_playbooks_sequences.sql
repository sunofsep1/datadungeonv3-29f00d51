-- CRM nurture: contact tasks, playbooks, sequences, reminder preferences

-- ---------------------------------------------------------------------------
-- contact_tasks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sequence_enrollment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_tasks_contact_id ON public.contact_tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tasks_user_due
  ON public.contact_tasks(user_id, due_at)
  WHERE completed_at IS NULL;

ALTER TABLE public.contact_tasks ENABLE ROW LEVEL SECURITY;

-- Contact access: same as contacts (user_id OR owner_id)
CREATE OR REPLACE FUNCTION public.user_can_access_contact(cid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = cid
      AND (auth.uid() = c.user_id OR auth.uid() = c.owner_id)
  );
$$;

DROP POLICY IF EXISTS "contact_tasks_select" ON public.contact_tasks;
CREATE POLICY "contact_tasks_select" ON public.contact_tasks
  FOR SELECT USING (
    auth.uid() = user_id AND public.user_can_access_contact(contact_id)
  );

DROP POLICY IF EXISTS "contact_tasks_insert" ON public.contact_tasks;
CREATE POLICY "contact_tasks_insert" ON public.contact_tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND public.user_can_access_contact(contact_id)
  );

DROP POLICY IF EXISTS "contact_tasks_update" ON public.contact_tasks;
CREATE POLICY "contact_tasks_update" ON public.contact_tasks
  FOR UPDATE USING (
    auth.uid() = user_id AND public.user_can_access_contact(contact_id)
  );

DROP POLICY IF EXISTS "contact_tasks_delete" ON public.contact_tasks;
CREATE POLICY "contact_tasks_delete" ON public.contact_tasks
  FOR DELETE USING (
    auth.uid() = user_id AND public.user_can_access_contact(contact_id)
  );

DROP TRIGGER IF EXISTS update_contact_tasks_updated_at ON public.contact_tasks;
CREATE TRIGGER update_contact_tasks_updated_at
  BEFORE UPDATE ON public.contact_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FK to enrollments added after table exists (optional link)
-- ---------------------------------------------------------------------------
-- playbook_templates & steps
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.playbook_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.playbook_template_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_template_id UUID NOT NULL REFERENCES public.playbook_templates(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playbook_template_steps_template ON public.playbook_template_steps(playbook_template_id, sort_order);

ALTER TABLE public.playbook_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_template_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "playbook_templates_all" ON public.playbook_templates;
CREATE POLICY "playbook_templates_all" ON public.playbook_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "playbook_template_steps_all" ON public.playbook_template_steps;
CREATE POLICY "playbook_template_steps_all" ON public.playbook_template_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.playbook_templates t
      WHERE t.id = playbook_template_id AND auth.uid() = t.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playbook_templates t
      WHERE t.id = playbook_template_id AND auth.uid() = t.user_id
    )
  );

DROP TRIGGER IF EXISTS update_playbook_templates_updated_at ON public.playbook_templates;
CREATE TRIGGER update_playbook_templates_updated_at
  BEFORE UPDATE ON public.playbook_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- contact_playbook_assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_playbook_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  playbook_template_id UUID NOT NULL REFERENCES public.playbook_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step_index INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contact_id, playbook_template_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_playbook_assignments_contact ON public.contact_playbook_assignments(contact_id);

ALTER TABLE public.contact_playbook_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_playbook_assignments_all" ON public.contact_playbook_assignments;
CREATE POLICY "contact_playbook_assignments_all" ON public.contact_playbook_assignments
  FOR ALL USING (
    auth.uid() = user_id AND public.user_can_access_contact(contact_id)
  )
  WITH CHECK (
    auth.uid() = user_id AND public.user_can_access_contact(contact_id)
  );

DROP TRIGGER IF EXISTS update_contact_playbook_assignments_updated_at ON public.contact_playbook_assignments;
CREATE TRIGGER update_contact_playbook_assignments_updated_at
  BEFORE UPDATE ON public.contact_playbook_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- user_reminder_preferences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_reminder_preferences (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_enabled BOOLEAN NOT NULL DEFAULT true,
  digest_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (digest_frequency IN ('daily', 'weekly')),
  last_digest_sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_reminder_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_reminder_preferences_own" ON public.user_reminder_preferences;
CREATE POLICY "user_reminder_preferences_own" ON public.user_reminder_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- nurture_sequences (distinct from legacy marketing "sequences" in types if any)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nurture_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nurture_sequence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.nurture_sequences(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  offset_days INTEGER NOT NULL DEFAULT 0,
  step_type TEXT NOT NULL CHECK (step_type IN ('task', 'email', 'prompt')),
  title TEXT NOT NULL,
  body TEXT,
  email_subject TEXT,
  email_html TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nurture_sequence_steps_sequence ON public.nurture_sequence_steps(sequence_id, sort_order);

CREATE TABLE IF NOT EXISTS public.nurture_sequence_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.nurture_sequences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step_index INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_step_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  pause_followup_cadence BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nurture_sequence_enrollments_due
  ON public.nurture_sequence_enrollments(next_step_at)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_nurture_sequence_enrollments_contact
  ON public.nurture_sequence_enrollments(contact_id)
  WHERE completed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS nurture_sequence_one_active_enrollment
  ON public.nurture_sequence_enrollments(contact_id, sequence_id)
  WHERE completed_at IS NULL;

ALTER TABLE public.nurture_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurture_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurture_sequence_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nurture_sequences_all" ON public.nurture_sequences;
CREATE POLICY "nurture_sequences_all" ON public.nurture_sequences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "nurture_sequence_steps_all" ON public.nurture_sequence_steps;
CREATE POLICY "nurture_sequence_steps_all" ON public.nurture_sequence_steps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.nurture_sequences s WHERE s.id = sequence_id AND auth.uid() = s.user_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.nurture_sequences s WHERE s.id = sequence_id AND auth.uid() = s.user_id)
  );

DROP POLICY IF EXISTS "nurture_sequence_enrollments_all" ON public.nurture_sequence_enrollments;
CREATE POLICY "nurture_sequence_enrollments_all" ON public.nurture_sequence_enrollments
  FOR ALL USING (
    auth.uid() = user_id AND public.user_can_access_contact(contact_id)
  )
  WITH CHECK (
    auth.uid() = user_id AND public.user_can_access_contact(contact_id)
  );

DROP TRIGGER IF EXISTS update_nurture_sequences_updated_at ON public.nurture_sequences;
CREATE TRIGGER update_nurture_sequences_updated_at
  BEFORE UPDATE ON public.nurture_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_nurture_sequence_enrollments_updated_at ON public.nurture_sequence_enrollments;
CREATE TRIGGER update_nurture_sequence_enrollments_updated_at
  BEFORE UPDATE ON public.nurture_sequence_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.contact_tasks
  ADD CONSTRAINT contact_tasks_sequence_enrollment_id_fkey
  FOREIGN KEY (sequence_enrollment_id) REFERENCES public.nurture_sequence_enrollments(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.nurture_sequence_enrollments.pause_followup_cadence IS 'When true, logging interactions does not advance next_follow_up_at until enrollment completes.';
COMMENT ON TABLE public.contact_tasks IS 'Per-contact tasks; optional link to sequence enrollment for steps created by automation.';

GRANT EXECUTE ON FUNCTION public.user_can_access_contact(UUID) TO authenticated;
