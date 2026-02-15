
-- Create contact_addresses if missing (idempotent when table already exists)
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
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view addresses of their contacts" ON public.contact_addresses;
DROP POLICY IF EXISTS "Users can insert addresses for their contacts" ON public.contact_addresses;
DROP POLICY IF EXISTS "Users can update addresses of their contacts" ON public.contact_addresses;
DROP POLICY IF EXISTS "Users can delete addresses of their contacts" ON public.contact_addresses;

CREATE POLICY "Users can view addresses of their contacts"
  ON public.contact_addresses FOR SELECT
  USING (contact_id IN (SELECT id FROM public.contacts WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert addresses for their contacts"
  ON public.contact_addresses FOR INSERT
  WITH CHECK (contact_id IN (SELECT id FROM public.contacts WHERE user_id = auth.uid()));

CREATE POLICY "Users can update addresses of their contacts"
  ON public.contact_addresses FOR UPDATE
  USING (contact_id IN (SELECT id FROM public.contacts WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete addresses of their contacts"
  ON public.contact_addresses FOR DELETE
  USING (contact_id IN (SELECT id FROM public.contacts WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_contact_addresses_updated_at ON public.contact_addresses;
CREATE TRIGGER update_contact_addresses_updated_at
  BEFORE UPDATE ON public.contact_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_contact_addresses_contact_id ON public.contact_addresses(contact_id);
