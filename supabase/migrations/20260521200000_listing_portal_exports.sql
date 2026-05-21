-- Portal export modelling (Reapit P2 #16) — per-listing portal config + feed logs.

CREATE TABLE IF NOT EXISTS public.listing_portal_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  last_status TEXT NOT NULL DEFAULT 'not_listed' CHECK (last_status IN ('not_listed', 'pending', 'syncing', 'live', 'error', 'withdrawn')),
  last_pushed_at TIMESTAMPTZ,
  portal_listing_id TEXT,
  last_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, portal_key)
);

CREATE INDEX IF NOT EXISTS idx_listing_portal_configs_listing
  ON public.listing_portal_configs(listing_id, portal_key);

CREATE TABLE IF NOT EXISTS public.listing_portal_feed_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_key TEXT NOT NULL,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  portal_listing_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'error')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_portal_feed_logs_listing
  ON public.listing_portal_feed_logs(listing_id, exported_at DESC);

ALTER TABLE public.listing_portal_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_portal_feed_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_portal_configs_select" ON public.listing_portal_configs;
CREATE POLICY "listing_portal_configs_select" ON public.listing_portal_configs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_portal_configs_insert" ON public.listing_portal_configs;
CREATE POLICY "listing_portal_configs_insert" ON public.listing_portal_configs
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_portal_configs_update" ON public.listing_portal_configs;
CREATE POLICY "listing_portal_configs_update" ON public.listing_portal_configs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_portal_configs_delete" ON public.listing_portal_configs;
CREATE POLICY "listing_portal_configs_delete" ON public.listing_portal_configs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_portal_feed_logs_select" ON public.listing_portal_feed_logs;
CREATE POLICY "listing_portal_feed_logs_select" ON public.listing_portal_feed_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_portal_feed_logs_insert" ON public.listing_portal_feed_logs;
CREATE POLICY "listing_portal_feed_logs_insert" ON public.listing_portal_feed_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_portal_feed_logs_delete" ON public.listing_portal_feed_logs;
CREATE POLICY "listing_portal_feed_logs_delete" ON public.listing_portal_feed_logs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS tr_listing_portal_configs_updated_at ON public.listing_portal_configs;
CREATE TRIGGER tr_listing_portal_configs_updated_at
  BEFORE UPDATE ON public.listing_portal_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
