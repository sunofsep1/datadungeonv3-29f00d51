-- Outbound SMS audit log (Edge Functions insert via service role; users read own rows)
CREATE TABLE IF NOT EXISTS public.sms_outbound (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  to_phone TEXT NOT NULL,
  body_preview TEXT,
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error TEXT,
  batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_outbound_user_created ON public.sms_outbound(user_id, created_at DESC);

ALTER TABLE public.sms_outbound ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_outbound_select_own" ON public.sms_outbound;
CREATE POLICY "sms_outbound_select_own" ON public.sms_outbound
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.sms_outbound IS 'Server-side log of outbound SMS; inserts use service role from Edge Functions.';

-- Optional per-user messages when a listing enters a pipeline stage (kanban column slug)
CREATE TABLE IF NOT EXISTS public.listing_stage_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pipeline_stage TEXT NOT NULL,
  sms_body TEXT,
  email_subject TEXT,
  email_html TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT listing_stage_automations_user_stage UNIQUE (user_id, pipeline_stage)
);

CREATE INDEX IF NOT EXISTS idx_listing_stage_automations_user ON public.listing_stage_automations(user_id);

ALTER TABLE public.listing_stage_automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_stage_automations_all" ON public.listing_stage_automations;
CREATE POLICY "listing_stage_automations_all" ON public.listing_stage_automations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_listing_stage_automations_updated_at ON public.listing_stage_automations;
CREATE TRIGGER update_listing_stage_automations_updated_at
  BEFORE UPDATE ON public.listing_stage_automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Nurture: automated SMS steps (same body field as tasks; no extra columns)
ALTER TABLE public.nurture_sequence_steps
  DROP CONSTRAINT IF EXISTS nurture_sequence_steps_step_type_check;

ALTER TABLE public.nurture_sequence_steps
  ADD CONSTRAINT nurture_sequence_steps_step_type_check
  CHECK (step_type IN ('task', 'email', 'prompt', 'sms'));
