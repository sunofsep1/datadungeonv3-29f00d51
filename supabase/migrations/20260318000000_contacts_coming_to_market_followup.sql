-- Add "coming to market" timing for reminder cadence (OTM = hot/weekly, 4w|3m = warm/2 weeks, 6+ = cold/3 months)
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS coming_to_market TEXT;

-- Optional constraint: only allow known values (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contacts_coming_to_market_check'
  ) THEN
    ALTER TABLE public.contacts
      ADD CONSTRAINT contacts_coming_to_market_check
      CHECK (coming_to_market IS NULL OR coming_to_market IN ('otm', '4_weeks', '3_months', '6_plus'));
  END IF;
END $$;

COMMENT ON COLUMN public.contacts.coming_to_market IS 'When contact is coming to market: otm (or now), 4_weeks, 3_months, 6_plus. Used with status (hot/warm/cold) for follow-up cadence.';

-- Ensure last_activity_at and next_follow_up_at exist (they may already)
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_contacts_next_follow_up_at ON public.contacts(next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;
