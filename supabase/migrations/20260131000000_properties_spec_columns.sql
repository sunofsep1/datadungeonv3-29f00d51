-- =============================================================================
-- Phase 1.1: Add spec columns to properties (CRM development rules)
-- =============================================================================

-- Add columns if not present (idempotent)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(14,2);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS price_listed NUMERIC(14,2);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rental_yield NUMERIC(5,2);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS cap_rate NUMERIC(5,2);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lot_size NUMERIC(12,2);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS building_size NUMERIC(12,2);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_condition TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS year_built INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Indexes for performance (per spec)
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON public.properties(property_type);
