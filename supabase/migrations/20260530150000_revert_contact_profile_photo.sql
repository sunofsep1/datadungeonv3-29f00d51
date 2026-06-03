-- Revert contact profile photo columns (feature removed)
ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_profile_photo_source_check;

ALTER TABLE public.contacts
  DROP COLUMN IF EXISTS profile_photo_url,
  DROP COLUMN IF EXISTS profile_photo_path,
  DROP COLUMN IF EXISTS profile_photo_source;
