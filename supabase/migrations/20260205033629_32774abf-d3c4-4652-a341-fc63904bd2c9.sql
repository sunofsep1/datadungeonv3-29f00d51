-- Phase 1.1: Create activity_log table (missing from schema)
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  description TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_log
CREATE POLICY "Users can view their own activity logs"
  ON public.activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity logs"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity logs"
  ON public.activity_log FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity logs"
  ON public.activity_log FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_activity_log_updated_at
  BEFORE UPDATE ON public.activity_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 1.1: Add google_event_id to appointments for Google Calendar sync
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Phase 1.2: Fix security - set search_path on function
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public;