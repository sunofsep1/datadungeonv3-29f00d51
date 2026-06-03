-- Reapit §3.1 General / For sale depth: authority, outgoings, investment, legal.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS for_sale_or_lease text NOT NULL DEFAULT 'for_sale'
    CHECK (for_sale_or_lease IN ('for_sale', 'for_lease')),
  ADD COLUMN IF NOT EXISTS sale_method text
    CHECK (sale_method IS NULL OR sale_method IN ('private_treaty', 'auction', 'tender', 'eoi')),
  ADD COLUMN IF NOT EXISTS listed_as_auction boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS authority_type text
    CHECK (authority_type IS NULL OR authority_type IN ('exclusive', 'open', 'conjunctional', 'sole', 'multi')),
  ADD COLUMN IF NOT EXISTS off_market boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_listing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quote_price numeric,
  ADD COLUMN IF NOT EXISTS gst_status text
    CHECK (gst_status IS NULL OR gst_status IN ('inclusive', 'exclusive', 'not_applicable')),
  ADD COLUMN IF NOT EXISTS access_details text,
  ADD COLUMN IF NOT EXISTS internal_info text,
  ADD COLUMN IF NOT EXISTS water_rates_amount numeric,
  ADD COLUMN IF NOT EXISTS water_rates_period text DEFAULT 'pa'
    CHECK (water_rates_period IS NULL OR water_rates_period IN ('pa', 'pq')),
  ADD COLUMN IF NOT EXISTS council_rates_amount numeric,
  ADD COLUMN IF NOT EXISTS council_rates_period text DEFAULT 'pa'
    CHECK (council_rates_period IS NULL OR council_rates_period IN ('pa', 'pq')),
  ADD COLUMN IF NOT EXISTS other_outgoings_amount numeric,
  ADD COLUMN IF NOT EXISTS other_outgoings_period text DEFAULT 'pa'
    CHECK (other_outgoings_period IS NULL OR other_outgoings_period IN ('pa', 'pq')),
  ADD COLUMN IF NOT EXISTS land_tax_amount numeric,
  ADD COLUMN IF NOT EXISTS land_tax_period text DEFAULT 'pa'
    CHECK (land_tax_period IS NULL OR land_tax_period IN ('pa', 'pq')),
  ADD COLUMN IF NOT EXISTS strata_admin_amount numeric,
  ADD COLUMN IF NOT EXISTS strata_admin_period text DEFAULT 'pa'
    CHECK (strata_admin_period IS NULL OR strata_admin_period IN ('pa', 'pq')),
  ADD COLUMN IF NOT EXISTS strata_sinking_amount numeric,
  ADD COLUMN IF NOT EXISTS strata_sinking_period text DEFAULT 'pa'
    CHECK (strata_sinking_period IS NULL OR strata_sinking_period IN ('pa', 'pq')),
  ADD COLUMN IF NOT EXISTS investment_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lease_potential_weekly numeric,
  ADD COLUMN IF NOT EXISTS return_pct numeric,
  ADD COLUMN IF NOT EXISTS tenanted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legal_description text,
  ADD COLUMN IF NOT EXISTS legal_lot text,
  ADD COLUMN IF NOT EXISTS legal_volume text,
  ADD COLUMN IF NOT EXISTS legal_block text,
  ADD COLUMN IF NOT EXISTS legal_deposited_plan text,
  ADD COLUMN IF NOT EXISTS legal_folio text,
  ADD COLUMN IF NOT EXISTS legal_section text,
  ADD COLUMN IF NOT EXISTS legal_zoning text;

COMMENT ON COLUMN public.listings.for_sale_or_lease IS 'For sale vs for lease listing mode';
COMMENT ON COLUMN public.listings.sale_method IS 'Private treaty, auction, tender, or EOI';
COMMENT ON COLUMN public.listings.authority_type IS 'Agency authority (exclusive, open, etc.)';
COMMENT ON COLUMN public.listings.water_rates_amount IS 'Water rates outgoing amount';
COMMENT ON COLUMN public.listings.investment_flag IS 'Investment property flag for portals and reports';

NOTIFY pgrst, 'reload schema';
