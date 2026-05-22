-- Agency expiry key date for P3 Agency Expiry report (Reapit §3.1 General tab).

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS key_date_agency_expiry TIMESTAMPTZ;

COMMENT ON COLUMN public.listings.key_date_agency_expiry IS 'Agency agreement expiry date for vendor authority tracking';

NOTIFY pgrst, 'reload schema';
