-- HubSpot-style: owner_id + address/suburb on properties (matches contacts schema)
-- Ensures property creation and contact_property_links work when schema uses owner_id

-- 1. Add owner_id and address/suburb to properties if not present (HubSpot schema)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Add address, suburb for HubSpot schema (if not present; app falls back to address_line1/city)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS suburb TEXT;

-- 3. Update properties RLS to work with owner_id (HubSpot schema: no user_id column)
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can create their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can manage own properties" ON public.properties;

DO $$
BEGIN
  -- HubSpot schema: properties has owner_id only (no user_id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='owner_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='user_id')
  THEN
    CREATE POLICY "Users can view their own properties" ON public.properties
      FOR SELECT USING (auth.uid() = owner_id);
    CREATE POLICY "Users can create their own properties" ON public.properties
      FOR INSERT WITH CHECK (auth.uid() = owner_id);
    CREATE POLICY "Users can update their own properties" ON public.properties
      FOR UPDATE USING (auth.uid() = owner_id);
    CREATE POLICY "Users can delete their own properties" ON public.properties
      FOR DELETE USING (auth.uid() = owner_id);
  ELSE
    -- DataDungeon or hybrid: has user_id
    CREATE POLICY "Users can view their own properties" ON public.properties
      FOR SELECT USING (auth.uid() = user_id OR (owner_id IS NOT NULL AND auth.uid() = owner_id));
    CREATE POLICY "Users can create their own properties" ON public.properties
      FOR INSERT WITH CHECK (auth.uid() = COALESCE(user_id, owner_id));
    CREATE POLICY "Users can update their own properties" ON public.properties
      FOR UPDATE USING (auth.uid() = user_id OR (owner_id IS NOT NULL AND auth.uid() = owner_id));
    CREATE POLICY "Users can delete their own properties" ON public.properties
      FOR DELETE USING (auth.uid() = user_id OR (owner_id IS NOT NULL AND auth.uid() = owner_id));
  END IF;
END $$;

-- 4. Update contact_property_links RLS (HubSpot: owner_id only on contacts and properties)
DROP POLICY IF EXISTS "Users can manage contact_property_links" ON public.contact_property_links;

CREATE POLICY "Users can manage contact_property_links" ON public.contact_property_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.owner_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.owner_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);
