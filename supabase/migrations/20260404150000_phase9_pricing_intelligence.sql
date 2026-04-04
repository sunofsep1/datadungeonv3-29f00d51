-- Phase 9: Pricing intelligence per listing (TAM brackets, supply/demand, competitors).

CREATE TABLE IF NOT EXISTS public.pricing_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  listing_price_estimate NUMERIC,
  tam_low NUMERIC NOT NULL,
  tam_high NUMERIC NOT NULL,
  bracket_size NUMERIC NOT NULL DEFAULT 25000,
  recommended_price NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listing_id)
);

CREATE TABLE IF NOT EXISTS public.price_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.pricing_analyses (id) ON DELETE CASCADE,
  bracket_low NUMERIC NOT NULL,
  bracket_high NUMERIC NOT NULL,
  active_supply INTEGER NOT NULL DEFAULT 0,
  recent_demand INTEGER NOT NULL DEFAULT 0,
  opportunity_score NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN active_supply = 0 THEN COALESCE(recent_demand, 0)::NUMERIC
      ELSE COALESCE(recent_demand, 0)::NUMERIC / NULLIF(active_supply, 0)::NUMERIC
    END
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_price_brackets_analysis ON public.price_brackets (analysis_id);

CREATE TABLE IF NOT EXISTS public.competitor_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.pricing_analyses (id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  list_price NUMERIC,
  days_on_market INTEGER,
  condition_vs_ours TEXT CHECK (
    condition_vs_ours IS NULL
    OR condition_vs_ours IN ('better', 'same', 'worse')
  ),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_competitor_listings_analysis ON public.competitor_listings (analysis_id);

DROP TRIGGER IF EXISTS trg_pricing_analyses_updated_at ON public.pricing_analyses;
CREATE TRIGGER trg_pricing_analyses_updated_at
  BEFORE UPDATE ON public.pricing_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pricing_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pricing_analyses_all ON public.pricing_analyses;
CREATE POLICY pricing_analyses_all ON public.pricing_analyses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS price_brackets_all ON public.price_brackets;
CREATE POLICY price_brackets_all ON public.price_brackets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pricing_analyses a
      JOIN public.listings l ON l.id = a.listing_id
      WHERE a.id = analysis_id AND l.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pricing_analyses a
      JOIN public.listings l ON l.id = a.listing_id
      WHERE a.id = analysis_id AND l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS competitor_listings_all ON public.competitor_listings;
CREATE POLICY competitor_listings_all ON public.competitor_listings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pricing_analyses a
      JOIN public.listings l ON l.id = a.listing_id
      WHERE a.id = analysis_id AND l.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pricing_analyses a
      JOIN public.listings l ON l.id = a.listing_id
      WHERE a.id = analysis_id AND l.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
