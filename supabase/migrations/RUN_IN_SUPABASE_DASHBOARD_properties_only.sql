-- =============================================================================
-- Run this in Supabase Dashboard → SQL Editor if "Properties table not set up"
-- Fixes the Properties section error. Safe to run multiple times (idempotent).
-- =============================================================================

-- Ensure updated_at trigger function exists (from base schema)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'Australia',
  property_type TEXT,
  bedrooms INTEGER,
  bathrooms NUMERIC(4,2),
  price NUMERIC(14,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own properties" ON public.properties;
CREATE POLICY "Users can manage own properties" ON public.properties
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contact–Property links (needed for property detail / owners)
CREATE TABLE IF NOT EXISTS public.contact_property_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'buyer', 'tenant', 'interested', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, property_id)
);

ALTER TABLE public.contact_property_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage contact_property_links" ON public.contact_property_links;
CREATE POLICY "Users can manage contact_property_links" ON public.contact_property_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS update_contact_property_links_updated_at ON public.contact_property_links;
CREATE TRIGGER update_contact_property_links_updated_at
  BEFORE UPDATE ON public.contact_property_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_contact_property_links_contact ON public.contact_property_links(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_property_links_property ON public.contact_property_links(property_id);

-- Realtime (ignore error if already in publication)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_property_links;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
