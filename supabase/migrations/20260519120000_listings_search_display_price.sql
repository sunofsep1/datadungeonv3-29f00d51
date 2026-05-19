-- Reapit-style search (internal) vs display (portal) price on listings.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS search_price numeric,
  ADD COLUMN IF NOT EXISTS display_price text;

COMMENT ON COLUMN public.listings.search_price IS 'Internal search/valuation price for GCI and portal filters (Reapit search price)';
COMMENT ON COLUMN public.listings.display_price IS 'Public display price line e.g. Offers Above $2m (Reapit display price)';

-- Backfill search_price from legacy price where useful
UPDATE public.listings
SET search_price = price
WHERE search_price IS NULL
  AND price IS NOT NULL
  AND price > 0;

NOTIFY pgrst, 'reload schema';
