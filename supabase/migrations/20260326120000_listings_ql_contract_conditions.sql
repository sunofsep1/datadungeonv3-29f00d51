-- QLD-style buyer contract condition timeframes (calendar days from contract), editable per listing.
-- Typical ranges informed by common QLD practice (finance/building & pest often 14–21 days; B&P often 7–14; due diligence varies).

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS contract_finance_days integer,
  ADD COLUMN IF NOT EXISTS contract_building_pest_days integer,
  ADD COLUMN IF NOT EXISTS contract_due_diligence_days integer,
  ADD COLUMN IF NOT EXISTS contract_subject_sale_days integer,
  ADD COLUMN IF NOT EXISTS contract_body_corporate_days integer;

COMMENT ON COLUMN public.listings.contract_finance_days IS 'Buyer finance condition — typical QLD 14–21 days from contract.';
COMMENT ON COLUMN public.listings.contract_building_pest_days IS 'Building & pest inspection condition — typical QLD 7–14 days.';
COMMENT ON COLUMN public.listings.contract_due_diligence_days IS 'Due diligence / searches condition — buyer investigations beyond standard B&P.';
COMMENT ON COLUMN public.listings.contract_subject_sale_days IS 'Subject to sale of buyer''s property / simultaneous settlement timing.';
COMMENT ON COLUMN public.listings.contract_body_corporate_days IS 'Body corporate information / records condition (units/townhouses).';
