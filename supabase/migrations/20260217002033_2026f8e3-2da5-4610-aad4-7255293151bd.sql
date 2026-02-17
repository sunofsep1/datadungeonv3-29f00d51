-- Make vision-board bucket private
UPDATE storage.buckets SET public = false WHERE id = 'vision-board';

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view vision board images" ON storage.objects;

-- Add user-scoped SELECT policy
CREATE POLICY "Users can view their own vision board images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vision-board' AND auth.uid()::text = (storage.foldername(name))[1]);