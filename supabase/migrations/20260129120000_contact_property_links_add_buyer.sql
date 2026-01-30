-- Add 'buyer' to contact_property_links.role CHECK
-- Run: supabase db push  or  supabase migration up

ALTER TABLE public.contact_property_links
  DROP CONSTRAINT IF EXISTS contact_property_links_role_check;

ALTER TABLE public.contact_property_links
  ADD CONSTRAINT contact_property_links_role_check
  CHECK (role IN ('owner', 'buyer', 'tenant', 'interested', 'other'));
