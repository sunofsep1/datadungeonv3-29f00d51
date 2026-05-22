-- §3.1 Listing depth: search range, marketing copy, feature flags, resources.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS search_price_min numeric,
  ADD COLUMN IF NOT EXISTS search_price_max numeric,
  ADD COLUMN IF NOT EXISTS marketing_headline text,
  ADD COLUMN IF NOT EXISTS marketing_description text,
  ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.listings.search_price_min IS 'Portal search filter lower bound (Reapit search range)';
COMMENT ON COLUMN public.listings.search_price_max IS 'Portal search filter upper bound (Reapit search range)';
COMMENT ON COLUMN public.listings.marketing_headline IS 'Listing headline for portals and collateral (≤150 chars)';
COMMENT ON COLUMN public.listings.marketing_description IS 'Listing description for portals (≤6000 chars)';
COMMENT ON COLUMN public.listings.feature_flags IS 'Selected standard feature keys for matching and portal feeds';

CREATE TABLE IF NOT EXISTS public.listing_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('photo', 'floorplan', 'document', 'link')),
  title TEXT,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_resources_listing
  ON public.listing_resources(listing_id, kind, sort_order);

ALTER TABLE public.listing_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_resources_select" ON public.listing_resources;
CREATE POLICY "listing_resources_select" ON public.listing_resources
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_resources_insert" ON public.listing_resources;
CREATE POLICY "listing_resources_insert" ON public.listing_resources
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_resources_update" ON public.listing_resources;
CREATE POLICY "listing_resources_update" ON public.listing_resources
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_resources_delete" ON public.listing_resources;
CREATE POLICY "listing_resources_delete" ON public.listing_resources
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

NOTIFY pgrst, 'reload schema';
