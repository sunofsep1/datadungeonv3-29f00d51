-- Optional campaign momentum fields for listing detail dashboard (defaults keep existing rows valid).
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS campaign_enquiry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS campaign_last_enquiry_at timestamptz,
  ADD COLUMN IF NOT EXISTS campaign_inspection_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS campaign_next_inspection_at timestamptz,
  ADD COLUMN IF NOT EXISTS campaign_offers_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS campaign_buyer_matches_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS campaign_start_at timestamptz;

COMMENT ON COLUMN public.listings.campaign_enquiry_count IS 'Total buyer enquiries for this listing campaign (manual or integration)';
COMMENT ON COLUMN public.listings.campaign_last_enquiry_at IS 'Timestamp of most recent enquiry';
COMMENT ON COLUMN public.listings.campaign_inspection_count IS 'Inspections held or booked count';
COMMENT ON COLUMN public.listings.campaign_next_inspection_at IS 'Next scheduled inspection';
COMMENT ON COLUMN public.listings.campaign_offers_count IS 'Offers received count';
COMMENT ON COLUMN public.listings.campaign_buyer_matches_count IS 'Matched buyers in CRM count';
COMMENT ON COLUMN public.listings.campaign_start_at IS 'When campaign went live (DOM anchor); null uses created_at in UI';
