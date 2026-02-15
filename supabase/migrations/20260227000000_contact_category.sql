-- Add optional colour category to contacts (8 fixed values for bulk categorise)
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN public.contacts.category IS 'One of: red, orange, yellow, green, blue, purple, pink, gray';
