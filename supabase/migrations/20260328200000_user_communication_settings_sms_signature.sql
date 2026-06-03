-- Per-user SMS signature for prospecting templates ({{signature}} merge).
CREATE TABLE IF NOT EXISTS public.user_communication_settings (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sms_signature TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_communication_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_communication_settings_own" ON public.user_communication_settings;
CREATE POLICY "user_communication_settings_own" ON public.user_communication_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS tr_user_communication_settings_updated_at ON public.user_communication_settings;
CREATE TRIGGER tr_user_communication_settings_updated_at
  BEFORE UPDATE ON public.user_communication_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
