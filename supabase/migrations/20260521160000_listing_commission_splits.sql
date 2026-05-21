-- Commission splits per listing (unlocked when under contract / exchanged)

CREATE TABLE IF NOT EXISTS public.listing_commission_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  split_pct NUMERIC NOT NULL CHECK (split_pct > 0 AND split_pct <= 100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_commission_splits_listing
  ON public.listing_commission_splits(listing_id, sort_order);

ALTER TABLE public.listing_commission_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_commission_splits_select" ON public.listing_commission_splits;
CREATE POLICY "listing_commission_splits_select" ON public.listing_commission_splits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_commission_splits_insert" ON public.listing_commission_splits;
CREATE POLICY "listing_commission_splits_insert" ON public.listing_commission_splits
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_commission_splits_update" ON public.listing_commission_splits;
CREATE POLICY "listing_commission_splits_update" ON public.listing_commission_splits
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_commission_splits_delete" ON public.listing_commission_splits;
CREATE POLICY "listing_commission_splits_delete" ON public.listing_commission_splits
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS tr_listing_commission_splits_updated_at ON public.listing_commission_splits;
CREATE TRIGGER tr_listing_commission_splits_updated_at
  BEFORE UPDATE ON public.listing_commission_splits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
