-- Kanban + journey mapping use `unconditional` between under_contract and settled.
-- Legacy constraint only allowed appraisal → listing → under_contract → settled → past_client.
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_pipeline_stage_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_pipeline_stage_check CHECK (
    pipeline_stage IS NULL
    OR pipeline_stage IN (
      'new',
      'prep',
      'appraisal',
      'listing',
      'negotiation',
      'under_contract',
      'unconditional',
      'settled',
      'past_client'
    )
  );
