-- =============================================================================
-- Undo HubSpot-style: ensure DataDungeon schema (name, status, user_id, address_line1, city)
-- Add missing columns, backfill from HubSpot columns, restore RLS on user_id
-- Run: supabase db push  or  SQL Editor
-- =============================================================================

-- 1. CONTACTS: Add DataDungeon columns if missing
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postcode TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Australia';

-- 2. CONTACTS: Backfill from HubSpot columns (only if those columns exist)
DO $$
DECLARE
  has_first_name boolean;
  has_lead_status boolean;
  has_owner_id boolean;
  has_address boolean;
  has_suburb boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contacts' AND column_name='first_name') INTO has_first_name;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contacts' AND column_name='lead_status') INTO has_lead_status;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contacts' AND column_name='owner_id') INTO has_owner_id;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contacts' AND column_name='address') INTO has_address;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contacts' AND column_name='suburb') INTO has_suburb;

  IF has_first_name THEN
    UPDATE public.contacts SET name = COALESCE(NULLIF(TRIM(name), ''), NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), '')) WHERE name IS NULL OR TRIM(name) = '';
  END IF;
  IF has_lead_status THEN
    UPDATE public.contacts SET status = COALESCE(NULLIF(TRIM(status), ''), CASE lead_status WHEN 'new' THEN 'lead' WHEN 'contacted' THEN 'warm' WHEN 'qualified' THEN 'hot' WHEN 'nurture' THEN 'cold' WHEN 'unqualified' THEN 'cold' WHEN 'customer' THEN 'customer' ELSE COALESCE(lead_status, 'lead') END) WHERE status IS NULL OR TRIM(status) = '';
  END IF;
  IF has_owner_id THEN
    UPDATE public.contacts SET user_id = COALESCE(user_id, owner_id) WHERE user_id IS NULL AND owner_id IS NOT NULL;
  END IF;
  IF has_address THEN
    UPDATE public.contacts SET address_line1 = COALESCE(NULLIF(TRIM(address_line1), ''), NULLIF(TRIM(address), '')) WHERE (address_line1 IS NULL OR TRIM(address_line1) = '') AND address IS NOT NULL AND TRIM(address) <> '';
  END IF;
  IF has_suburb THEN
    UPDATE public.contacts SET city = COALESCE(NULLIF(TRIM(city), ''), NULLIF(TRIM(suburb), '')) WHERE (city IS NULL OR TRIM(city) = '') AND suburb IS NOT NULL AND TRIM(suburb) <> '';
  END IF;
END $$;

-- 4. PROPERTIES: Add DataDungeon columns if missing
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postcode TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'AU';

-- 5. PROPERTIES: Backfill from HubSpot columns (only if those columns exist)
DO $$
DECLARE
  has_owner_id boolean;
  has_address boolean;
  has_suburb boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='owner_id') INTO has_owner_id;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='address') INTO has_address;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='suburb') INTO has_suburb;

  IF has_owner_id THEN
    UPDATE public.properties SET user_id = COALESCE(user_id, owner_id) WHERE user_id IS NULL AND owner_id IS NOT NULL;
  END IF;
  IF has_address THEN
    UPDATE public.properties SET address_line1 = COALESCE(NULLIF(TRIM(address_line1), ''), NULLIF(TRIM(address), '')) WHERE (address_line1 IS NULL OR TRIM(address_line1) = '') AND address IS NOT NULL AND TRIM(address) <> '';
  END IF;
  IF has_suburb THEN
    UPDATE public.properties SET city = COALESCE(NULLIF(TRIM(city), ''), NULLIF(TRIM(suburb), '')) WHERE (city IS NULL OR TRIM(city) = '') AND suburb IS NOT NULL AND TRIM(suburb) <> '';
  END IF;
END $$;

-- 7. RLS: Restore contacts policies to use user_id (with owner_id fallback for hybrid)
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;

CREATE POLICY "Users can view their own contacts" ON public.contacts
  FOR SELECT USING (auth.uid() = COALESCE(user_id, owner_id));
CREATE POLICY "Users can update their own contacts" ON public.contacts
  FOR UPDATE USING (auth.uid() = COALESCE(user_id, owner_id));
CREATE POLICY "Users can delete their own contacts" ON public.contacts
  FOR DELETE USING (auth.uid() = COALESCE(user_id, owner_id));

DROP POLICY IF EXISTS "Users can create their own contacts" ON public.contacts;
CREATE POLICY "Users can create their own contacts" ON public.contacts
  FOR INSERT WITH CHECK (auth.uid() = COALESCE(user_id, owner_id));

-- 8. RLS: Restore properties policies to use user_id
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can create their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can manage own properties" ON public.properties;

CREATE POLICY "Users can view their own properties" ON public.properties
  FOR SELECT USING (auth.uid() = COALESCE(user_id, owner_id));
CREATE POLICY "Users can create their own properties" ON public.properties
  FOR INSERT WITH CHECK (auth.uid() = COALESCE(user_id, owner_id));
CREATE POLICY "Users can update their own properties" ON public.properties
  FOR UPDATE USING (auth.uid() = COALESCE(user_id, owner_id));
CREATE POLICY "Users can delete their own properties" ON public.properties
  FOR DELETE USING (auth.uid() = COALESCE(user_id, owner_id));

-- 9. RLS: Restore contact_property_links to use user_id
DROP POLICY IF EXISTS "Users can manage contact_property_links" ON public.contact_property_links;

CREATE POLICY "Users can manage contact_property_links" ON public.contact_property_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND auth.uid() = COALESCE(c.user_id, c.owner_id))
    AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND auth.uid() = COALESCE(p.user_id, p.owner_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND auth.uid() = COALESCE(c.user_id, c.owner_id))
    AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND auth.uid() = COALESCE(p.user_id, p.owner_id))
  );

-- 10. Index for user_id filters
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);

COMMENT ON COLUMN public.contacts.name IS 'DataDungeon: full display name';
COMMENT ON COLUMN public.contacts.status IS 'DataDungeon: lead, warm, hot, cold, customer';
