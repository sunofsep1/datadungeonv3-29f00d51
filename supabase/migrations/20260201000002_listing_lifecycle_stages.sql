-- =============================================================================
-- Listing lifecycle alignment: map legacy pipeline_stage to lifecycle stages
-- Appraisal → Listing → Under Contract → Settled → Past Client
-- =============================================================================

-- Map existing values to new lifecycle stages (non-destructive)
UPDATE public.listings SET pipeline_stage = 'appraisal' WHERE pipeline_stage IN ('new', 'contacted');
UPDATE public.listings SET pipeline_stage = 'listing' WHERE pipeline_stage IN ('inspection', 'offer');
UPDATE public.listings SET pipeline_stage = 'under_contract' WHERE pipeline_stage = 'under-contract';
-- 'settled' stays 'settled'; 'past_client' is new

-- Optional: add check constraint so only allowed values can be stored
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_pipeline_stage_check'
  ) THEN
    ALTER TABLE public.listings
    ADD CONSTRAINT listings_pipeline_stage_check
    CHECK (pipeline_stage IN ('appraisal', 'listing', 'under_contract', 'settled', 'past_client'));
  END IF;
END $$;
