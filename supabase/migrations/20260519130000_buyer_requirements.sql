-- Buyer requirements (Reapit-style saved briefs per contact)

CREATE TABLE IF NOT EXISTS public.buyer_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  action TEXT NOT NULL DEFAULT 'buy' CHECK (action IN ('buy', 'rent')),
  property_type TEXT,
  category TEXT,
  state TEXT DEFAULT 'QLD',
  suburbs TEXT[] NOT NULL DEFAULT '{}',
  price_min NUMERIC,
  price_max NUMERIC,
  beds_min INTEGER,
  baths_min INTEGER,
  parking_min INTEGER,
  land_min_sqm NUMERIC,
  land_max_sqm NUMERIC,
  building_min_sqm NUMERIC,
  building_max_sqm NUMERIC,
  features_required TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyer_requirements_user_id ON public.buyer_requirements(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_requirements_contact_id ON public.buyer_requirements(contact_id);

ALTER TABLE public.buyer_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage buyer_requirements via contact" ON public.buyer_requirements;
CREATE POLICY "Users manage buyer_requirements via contact"
  ON public.buyer_requirements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_id
        AND auth.uid() = COALESCE(c.user_id, c.owner_id)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_id
        AND auth.uid() = COALESCE(c.user_id, c.owner_id)
    )
  );

DROP TRIGGER IF EXISTS update_buyer_requirements_updated_at ON public.buyer_requirements;
CREATE TRIGGER update_buyer_requirements_updated_at
  BEFORE UPDATE ON public.buyer_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
