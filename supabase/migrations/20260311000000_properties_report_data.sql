-- Add property_report (JSONB) for parsed Pricefinder report data
-- Add car_spaces if not present (for beds/baths/cars from report)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_report JSONB;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS car_spaces INTEGER;
