-- Link sales listings to CRM properties + denormalized hero image for pipeline cards.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS listing_image_url text;

CREATE INDEX IF NOT EXISTS listings_property_id_idx ON public.listings(property_id);

COMMENT ON COLUMN public.listings.property_id IS 'CRM property this deal is tied to; vendor should be linked on the property.';
COMMENT ON COLUMN public.listings.listing_image_url IS 'Hero image for kanban (typically property.images[0]).';
