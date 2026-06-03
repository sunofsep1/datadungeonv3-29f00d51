-- =============================================================================
-- Phase 1.3: contact_addresses table (CRM development rules)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contact_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Australia',
  address_type TEXT DEFAULT 'home',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage contact_addresses" ON public.contact_addresses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS update_contact_addresses_updated_at ON public.contact_addresses;
CREATE TRIGGER update_contact_addresses_updated_at
  BEFORE UPDATE ON public.contact_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_contact_addresses_contact_id ON public.contact_addresses(contact_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_addresses;
