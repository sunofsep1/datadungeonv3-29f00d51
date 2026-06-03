-- Monthly listing portal hits (Reapit P2 #17) — manual/import until live syndication feeds.

CREATE TABLE IF NOT EXISTS public.listing_portal_hits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hit_month DATE NOT NULL,
  portal_key TEXT,
  hit_count INTEGER NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'portal_feed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_portal_hits_unique
  ON public.listing_portal_hits(listing_id, hit_month, COALESCE(portal_key, ''));

CREATE INDEX IF NOT EXISTS idx_listing_portal_hits_listing_month
  ON public.listing_portal_hits(listing_id, hit_month DESC);

ALTER TABLE public.listing_portal_hits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_portal_hits_select" ON public.listing_portal_hits;
CREATE POLICY "listing_portal_hits_select" ON public.listing_portal_hits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_portal_hits_insert" ON public.listing_portal_hits;
CREATE POLICY "listing_portal_hits_insert" ON public.listing_portal_hits
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_portal_hits_update" ON public.listing_portal_hits;
CREATE POLICY "listing_portal_hits_update" ON public.listing_portal_hits
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_portal_hits_delete" ON public.listing_portal_hits;
CREATE POLICY "listing_portal_hits_delete" ON public.listing_portal_hits
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS tr_listing_portal_hits_updated_at ON public.listing_portal_hits;
CREATE TRIGGER tr_listing_portal_hits_updated_at
  BEFORE UPDATE ON public.listing_portal_hits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
