-- SMS suite: reusable contact lists, saved templates, scheduled mass broadcasts

CREATE TABLE IF NOT EXISTS public.sms_contact_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS public.sms_contact_list_members (
  list_id UUID NOT NULL REFERENCES public.sms_contact_lists(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_sms_list_members_contact ON public.sms_contact_list_members(contact_id);

CREATE TABLE IF NOT EXISTS public.sms_user_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS public.sms_scheduled_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT NOT NULL,
  merge_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  append_opt_out BOOLEAN NOT NULL DEFAULT true,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sms_scheduled_user_status_at
  ON public.sms_scheduled_broadcasts(user_id, status, scheduled_at);

CREATE TABLE IF NOT EXISTS public.sms_scheduled_broadcast_recipients (
  broadcast_id UUID NOT NULL REFERENCES public.sms_scheduled_broadcasts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (broadcast_id, contact_id)
);

-- RLS
ALTER TABLE public.sms_contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_contact_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_user_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_scheduled_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_scheduled_broadcast_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_contact_lists_own" ON public.sms_contact_lists;
CREATE POLICY "sms_contact_lists_own" ON public.sms_contact_lists
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sms_list_members_via_list" ON public.sms_contact_list_members;
CREATE POLICY "sms_list_members_via_list" ON public.sms_contact_list_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sms_contact_lists l WHERE l.id = list_id AND l.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.sms_contact_lists l WHERE l.id = list_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "sms_user_templates_own" ON public.sms_user_templates;
CREATE POLICY "sms_user_templates_own" ON public.sms_user_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sms_scheduled_broadcasts_own" ON public.sms_scheduled_broadcasts;
CREATE POLICY "sms_scheduled_broadcasts_own" ON public.sms_scheduled_broadcasts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sms_scheduled_recipients_via_broadcast" ON public.sms_scheduled_broadcast_recipients;
CREATE POLICY "sms_scheduled_recipients_via_broadcast" ON public.sms_scheduled_broadcast_recipients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sms_scheduled_broadcasts b WHERE b.id = broadcast_id AND b.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.sms_scheduled_broadcasts b WHERE b.id = broadcast_id AND b.user_id = auth.uid())
  );

COMMENT ON TABLE public.sms_contact_lists IS 'User-defined segments for SMS suite mass sends.';
COMMENT ON TABLE public.sms_scheduled_broadcasts IS 'Scheduled mass SMS; recipients snapshotted in sms_scheduled_broadcast_recipients.';
