-- =============================================================================
-- Make street_address nullable on properties (DataDungeon uses address_line1)
-- Fixes property creation: "null value in column street_address violates not-null constraint"
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'street_address'
  ) THEN
    ALTER TABLE public.properties ALTER COLUMN street_address DROP NOT NULL;
  END IF;
END $$;
