-- Geocode coordinates for property map pins
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;

COMMENT ON COLUMN public.properties.latitude IS 'Geocoded latitude for map display.';
COMMENT ON COLUMN public.properties.longitude IS 'Geocoded longitude for map display.';
COMMENT ON COLUMN public.properties.geocoded_at IS 'When latitude/longitude were last geocoded.';
