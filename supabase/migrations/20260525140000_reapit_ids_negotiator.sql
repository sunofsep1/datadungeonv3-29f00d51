-- Phase 5 scaffold: Reapit external IDs + listing negotiator assignment

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS reapit_id TEXT,
  ADD COLUMN IF NOT EXISTS reapit_synced_at TIMESTAMPTZ;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS reapit_id TEXT,
  ADD COLUMN IF NOT EXISTS reapit_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS negotiator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_reapit_id
  ON public.contacts(reapit_id)
  WHERE reapit_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_reapit_id
  ON public.listings(reapit_id)
  WHERE reapit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_negotiator_id
  ON public.listings(negotiator_id)
  WHERE negotiator_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
