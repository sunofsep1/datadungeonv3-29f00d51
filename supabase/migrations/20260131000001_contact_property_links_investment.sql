-- =============================================================================
-- Phase 1.2: Add investment columns and extend relationship types (contact_property_links)
-- =============================================================================

-- Add investment / relationship columns
ALTER TABLE public.contact_property_links ADD COLUMN IF NOT EXISTS ownership_percentage NUMERIC(5,2);
ALTER TABLE public.contact_property_links ADD COLUMN IF NOT EXISTS acquisition_date DATE;
ALTER TABLE public.contact_property_links ADD COLUMN IF NOT EXISTS holding_period_months INTEGER;
ALTER TABLE public.contact_property_links ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(14,2);
ALTER TABLE public.contact_property_links ADD COLUMN IF NOT EXISTS sale_price NUMERIC(14,2);

-- Extend role CHECK: owner, seller, buyer, tenant, investor, agent, interested, other
ALTER TABLE public.contact_property_links DROP CONSTRAINT IF EXISTS contact_property_links_role_check;
ALTER TABLE public.contact_property_links
  ADD CONSTRAINT contact_property_links_role_check
  CHECK (role IN ('owner', 'seller', 'buyer', 'tenant', 'investor', 'agent', 'interested', 'other'));
