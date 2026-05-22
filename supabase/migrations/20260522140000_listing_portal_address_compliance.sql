-- P4: Portal address display modes + hide address for silent sale (Reapit §3.1 General).

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS address_display_mode TEXT NOT NULL DEFAULT 'full'
    CHECK (address_display_mode IN ('full', 'street_only', 'suburb_only')),
  ADD COLUMN IF NOT EXISTS hide_address_portal BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.listings.address_display_mode IS 'How address appears in CRM: full, street_only, or suburb_only';
COMMENT ON COLUMN public.listings.hide_address_portal IS 'When true, portal exports use suburb-only / withheld address line';

NOTIFY pgrst, 'reload schema';
