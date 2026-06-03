-- Contact profile photo fields + public storage bucket
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_path TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_source TEXT;

COMMENT ON COLUMN public.contacts.profile_photo_url IS 'Public URL for contact avatar (Gravatar, pasted URL, or Supabase storage URL).';
COMMENT ON COLUMN public.contacts.profile_photo_path IS 'Storage path in contact-photos bucket when uploaded.';
COMMENT ON COLUMN public.contacts.profile_photo_source IS 'How photo was set: upload, gravatar, or url.';

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_profile_photo_source_check;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_profile_photo_source_check
  CHECK (profile_photo_source IS NULL OR profile_photo_source IN ('upload', 'gravatar', 'url'));

INSERT INTO storage.buckets (id, name, public)
VALUES ('contact-photos', 'contact-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view contact photos" ON storage.objects;
CREATE POLICY "Anyone can view contact photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contact-photos');

DROP POLICY IF EXISTS "Users can upload contact photos to own folder" ON storage.objects;
CREATE POLICY "Users can upload contact photos to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'contact-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own contact photos" ON storage.objects;
CREATE POLICY "Users can update own contact photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'contact-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own contact photos" ON storage.objects;
CREATE POLICY "Users can delete own contact photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'contact-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
