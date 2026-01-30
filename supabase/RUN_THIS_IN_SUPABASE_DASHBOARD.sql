-- =============================================================================
-- Data Dungeon: Fix "add address", property linking, and "Link property"
-- =============================================================================
-- Run this once in Supabase Dashboard → SQL Editor. No CLI needed.
-- Safe to run again (uses IF NOT EXISTS / IF EXISTS).
-- =============================================================================

-- 0. Helper function for updated_at (required by properties/links triggers)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Add all columns to contacts (fixes "add address" and "source does not exist")
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS story TEXT,
  ADD COLUMN IF NOT EXISTS selling_intentions TEXT,
  ADD COLUMN IF NOT EXISTS pain_points TEXT,
  ADD COLUMN IF NOT EXISTS pleasure_points TEXT,
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT,
  ADD COLUMN IF NOT EXISTS current_situation_notes TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postcode TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Australia';

-- 2. Allow "buyer" role on property links (only if that table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contact_property_links') THEN
    ALTER TABLE public.contact_property_links DROP CONSTRAINT IF EXISTS contact_property_links_role_check;
    ALTER TABLE public.contact_property_links
      ADD CONSTRAINT contact_property_links_role_check
      CHECK (role IN ('owner', 'buyer', 'tenant', 'interested', 'other'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Properties table and contact_property_links (fixes "Failed to create property" / Link property)
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

-- 3b. Add missing columns to properties if table existed with old schema (fixes "column address_line1 does not exist")
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postcode TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS property_type TEXT,
  ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
  ADD COLUMN IF NOT EXISTS bathrooms NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS price NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3c. If properties has old "address" column (NOT NULL), make it nullable so RPC insert works
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'address') THEN
    ALTER TABLE public.properties ALTER COLUMN address DROP NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

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

-- 4. Reload schema cache (fixes "Could not find address_line1 in schema cache")
--    Supabase's API caches the schema; after adding columns it must be reloaded.
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- 5. RPC functions for contact create/update (bypasses schema cache issues)
-- =============================================================================
-- These functions insert/update contacts directly in Postgres, avoiding
-- PostgREST's table schema validation. The app calls these via supabase.rpc().

-- 5a. Create contact (including address fields)
CREATE OR REPLACE FUNCTION create_contact_with_address(payload jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  result json;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.contacts (
    user_id,
    name,
    first_name,
    last_name,
    phone,
    email,
    source,
    notes,
    status,
    story,
    selling_intentions,
    pain_points,
    pleasure_points,
    pipeline_stage,
    current_situation_notes,
    address_line1,
    address_line2,
    city,
    state,
    postcode,
    country
  )
  VALUES (
    uid,
    COALESCE(payload->>'name', ''),
    NULLIF(TRIM(payload->>'first_name'), ''),
    NULLIF(TRIM(payload->>'last_name'), ''),
    NULLIF(TRIM(payload->>'phone'), ''),
    NULLIF(TRIM(payload->>'email'), ''),
    NULLIF(TRIM(payload->>'source'), ''),
    NULLIF(TRIM(payload->>'notes'), ''),
    NULLIF(TRIM(payload->>'status'), ''),
    NULLIF(TRIM(payload->>'story'), ''),
    NULLIF(TRIM(payload->>'selling_intentions'), ''),
    NULLIF(TRIM(payload->>'pain_points'), ''),
    NULLIF(TRIM(payload->>'pleasure_points'), ''),
    NULLIF(TRIM(payload->>'pipeline_stage'), ''),
    NULLIF(TRIM(payload->>'current_situation_notes'), ''),
    NULLIF(TRIM(payload->>'address_line1'), ''),
    NULLIF(TRIM(payload->>'address_line2'), ''),
    NULLIF(TRIM(payload->>'city'), ''),
    NULLIF(TRIM(payload->>'state'), ''),
    NULLIF(TRIM(payload->>'postcode'), ''),
    COALESCE(NULLIF(TRIM(payload->>'country'), ''), 'Australia')
  )
  RETURNING to_jsonb(contacts.*) INTO result;

  RETURN result;
END;
$$;

-- 5b. Update contact (including address fields)
CREATE OR REPLACE FUNCTION update_contact_with_address(payload jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  contact_id uuid;
  result json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  contact_id := (payload->>'id')::uuid;
  IF contact_id IS NULL THEN
    RAISE EXCEPTION 'Missing id in payload';
  END IF;

  UPDATE public.contacts
  SET
    name = COALESCE(NULLIF(TRIM(payload->>'name'), ''), name),
    first_name = CASE WHEN payload ? 'first_name' THEN NULLIF(TRIM(payload->>'first_name'), '') ELSE first_name END,
    last_name = CASE WHEN payload ? 'last_name' THEN NULLIF(TRIM(payload->>'last_name'), '') ELSE last_name END,
    phone = CASE WHEN payload ? 'phone' THEN NULLIF(TRIM(payload->>'phone'), '') ELSE phone END,
    email = CASE WHEN payload ? 'email' THEN NULLIF(TRIM(payload->>'email'), '') ELSE email END,
    source = CASE WHEN payload ? 'source' THEN NULLIF(TRIM(payload->>'source'), '') ELSE source END,
    notes = CASE WHEN payload ? 'notes' THEN NULLIF(TRIM(payload->>'notes'), '') ELSE notes END,
    status = CASE WHEN payload ? 'status' THEN NULLIF(TRIM(payload->>'status'), '') ELSE status END,
    story = CASE WHEN payload ? 'story' THEN NULLIF(TRIM(payload->>'story'), '') ELSE story END,
    selling_intentions = CASE WHEN payload ? 'selling_intentions' THEN NULLIF(TRIM(payload->>'selling_intentions'), '') ELSE selling_intentions END,
    pain_points = CASE WHEN payload ? 'pain_points' THEN NULLIF(TRIM(payload->>'pain_points'), '') ELSE pain_points END,
    pleasure_points = CASE WHEN payload ? 'pleasure_points' THEN NULLIF(TRIM(payload->>'pleasure_points'), '') ELSE pleasure_points END,
    pipeline_stage = CASE WHEN payload ? 'pipeline_stage' THEN NULLIF(TRIM(payload->>'pipeline_stage'), '') ELSE pipeline_stage END,
    current_situation_notes = CASE WHEN payload ? 'current_situation_notes' THEN NULLIF(TRIM(payload->>'current_situation_notes'), '') ELSE current_situation_notes END,
    address_line1 = CASE WHEN payload ? 'address_line1' THEN NULLIF(TRIM(payload->>'address_line1'), '') ELSE address_line1 END,
    address_line2 = CASE WHEN payload ? 'address_line2' THEN NULLIF(TRIM(payload->>'address_line2'), '') ELSE address_line2 END,
    city = CASE WHEN payload ? 'city' THEN NULLIF(TRIM(payload->>'city'), '') ELSE city END,
    state = CASE WHEN payload ? 'state' THEN NULLIF(TRIM(payload->>'state'), '') ELSE state END,
    postcode = CASE WHEN payload ? 'postcode' THEN NULLIF(TRIM(payload->>'postcode'), '') ELSE postcode END,
    country = CASE WHEN payload ? 'country' THEN COALESCE(NULLIF(TRIM(payload->>'country'), ''), 'Australia') ELSE country END,
    updated_at = NOW()
  WHERE id = contact_id
  RETURNING to_jsonb(contacts.*) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Contact not found or access denied';
  END IF;

  RETURN result;
END;
$$;

-- =============================================================================
-- 6. RPC for property create (bypasses schema cache for "Link property")
-- =============================================================================
CREATE OR REPLACE FUNCTION create_property_with_address(payload jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  result json;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.properties (
    user_id,
    address_line1,
    address_line2,
    city,
    state,
    postcode,
    country,
    property_type,
    bedrooms,
    bathrooms,
    price,
    notes
  )
  VALUES (
    uid,
    NULLIF(TRIM(payload->>'address_line1'), ''),
    NULLIF(TRIM(payload->>'address_line2'), ''),
    NULLIF(TRIM(payload->>'city'), ''),
    NULLIF(TRIM(payload->>'state'), ''),
    NULLIF(TRIM(payload->>'postcode'), ''),
    COALESCE(NULLIF(TRIM(payload->>'country'), ''), 'Australia'),
    NULLIF(TRIM(payload->>'property_type'), ''),
    (NULLIF(TRIM(COALESCE(payload->>'bedrooms', '')), ''))::INTEGER,
    (NULLIF(TRIM(COALESCE(payload->>'bathrooms', '')), ''))::NUMERIC(4,2),
    (NULLIF(TRIM(COALESCE(payload->>'price', '')), ''))::NUMERIC(14,2),
    NULLIF(TRIM(payload->>'notes'), '')
  )
  RETURNING to_jsonb(properties.*) INTO result;

  RETURN result;
END;
$$;

-- =============================================================================
-- 7. RPC to fetch single property by id (bypasses schema cache for property detail page)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_property_by_id(prop_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT to_jsonb(p.*) INTO result
  FROM public.properties p
  WHERE p.id = prop_id AND p.user_id = auth.uid();
  RETURN result;
END;
$$;

-- Reload schema again so PostgREST sees the new functions
NOTIFY pgrst, 'reload schema';
