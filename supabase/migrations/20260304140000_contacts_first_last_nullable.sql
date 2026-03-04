-- =============================================================================
-- Make first_name and last_name nullable on contacts (DataDungeon uses "name")
-- Fixes CSV import: "null value in column first_name violates not-null constraint"
-- =============================================================================

-- Drop NOT NULL on first_name and last_name if they exist and have the constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.contacts ALTER COLUMN first_name DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.contacts ALTER COLUMN last_name DROP NOT NULL;
  END IF;
END $$;
