-- Settings Phase 2: business defaults, email comm fields, user avatar storage.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS default_appointment_duration INT NOT NULL DEFAULT 60
    CHECK (default_appointment_duration IN (30, 45, 60, 90)),
  ADD COLUMN IF NOT EXISTS default_follow_up_days INT NOT NULL DEFAULT 14
    CHECK (default_follow_up_days >= 1 AND default_follow_up_days <= 365);

ALTER TABLE public.user_communication_settings
  ADD COLUMN IF NOT EXISTS email_signature TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_from_name TEXT NOT NULL DEFAULT '';

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view user avatars" ON storage.objects;
CREATE POLICY "Anyone can view user avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
