-- =============================================================================
-- Universal Activity System: activity_log table (timeline events)
-- Links to contact, property, listing; keeps existing activities for KPI.
-- =============================================================================

CREATE TYPE public.activity_log_type AS ENUM (
  'note',
  'call',
  'email',
  'inspection',
  'status_change',
  'system',
  'open_house',
  'settlement'
);

CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type public.activity_log_type NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_contact_id ON public.activity_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_property_id ON public.activity_log(property_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_listing_id ON public.activity_log(listing_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_occurred_at ON public.activity_log(occurred_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity_log" ON public.activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity_log" ON public.activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity_log" ON public.activity_log
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity_log" ON public.activity_log
  FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
