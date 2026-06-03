-- Add price column to properties (fixes "Could not find the 'price' column" on add/update)
-- DataDungeon app uses price and price_listed; ensure both exist
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS price NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS price_listed NUMERIC(14,2);
