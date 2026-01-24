-- Add contact_id to listings table for property owner relationship
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Create calls table for tracking prospecting calls
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_name TEXT,
  call_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_minutes INTEGER,
  notes TEXT,
  outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on calls
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for calls
CREATE POLICY "Users can view their own calls"
ON public.calls FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calls"
ON public.calls FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calls"
ON public.calls FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calls"
ON public.calls FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger for calls
CREATE TRIGGER update_calls_updated_at
BEFORE UPDATE ON public.calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for calls
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;