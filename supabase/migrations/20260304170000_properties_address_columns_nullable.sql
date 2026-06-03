-- =============================================================================
-- Make all address/location columns nullable on properties (DataDungeon schema)
-- Stops NOT NULL constraint violations during CSV import when address data is
-- partial or missing. Covers: postcode, state, property_type, address, suburb,
-- street_address (street_address and suburb may already be nullable).
-- =============================================================================

DO $$
DECLARE
  col text;
  cols text[] := ARRAY['postcode', 'state', 'property_type', 'address', 'suburb', 'street_address'];
BEGIN
  FOREACH col IN ARRAY cols
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = col
    ) THEN
      BEGIN
        EXECUTE format('ALTER TABLE public.properties ALTER COLUMN %I DROP NOT NULL', col);
      EXCEPTION WHEN OTHERS THEN
        -- Column may already be nullable, ignore
        NULL;
      END;
    END IF;
  END LOOP;
END $$;
