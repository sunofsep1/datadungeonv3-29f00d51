-- =============================================================================
-- Create missing tables: properties, tags, contact_channels, contact_property_links
-- =============================================================================

-- 1. Properties table
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
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can create their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;

CREATE POLICY "Users can view their own properties" ON public.properties
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own properties" ON public.properties
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties" ON public.properties
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties" ON public.properties
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can create their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON public.tags;

CREATE POLICY "Users can view their own tags" ON public.tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags" ON public.tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" ON public.tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" ON public.tags
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Contact Tags junction table
CREATE TABLE IF NOT EXISTS public.contact_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, tag_id)
);

ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage contact_tags" ON public.contact_tags;

CREATE POLICY "Users can manage contact_tags" ON public.contact_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.user_id = auth.uid())
  );

-- 4. Contact Channels table
CREATE TABLE IF NOT EXISTS public.contact_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,
  channel_value TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage contact_channels" ON public.contact_channels;

CREATE POLICY "Users can manage contact_channels" ON public.contact_channels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS update_contact_channels_updated_at ON public.contact_channels;
CREATE TRIGGER update_contact_channels_updated_at
  BEFORE UPDATE ON public.contact_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Contact Property Links table (many-to-many: contacts <-> properties)
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_contact ON public.contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON public.contact_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_contact_channels_contact ON public.contact_channels(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_property_links_contact ON public.contact_property_links(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_property_links_property ON public.contact_property_links(property_id);

-- Enable realtime for all new tables (skip if already added by an earlier migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'properties') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tags') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tags;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contact_tags') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_tags;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contact_channels') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_channels;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contact_property_links') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_property_links;
  END IF;
END $$;