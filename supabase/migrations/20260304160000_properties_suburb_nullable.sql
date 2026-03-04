-- Make suburb nullable on properties (DataDungeon uses city)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'suburb'
  ) THEN
    ALTER TABLE public.properties ALTER COLUMN suburb DROP NOT NULL;
  END IF;
END $$;
