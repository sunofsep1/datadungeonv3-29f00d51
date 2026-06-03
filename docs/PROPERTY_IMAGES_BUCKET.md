# Fix "Bucket not found" for property hero images

When you see **Upload failed. Bucket not found** on the property detail page, the `property-images` storage bucket doesn’t exist yet. Create it once:

## Option A – Run SQL in Supabase (recommended)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor**.
3. Paste and run this:

```sql
-- Create the bucket (public so property cards can show images without signed URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies: anyone can view; only you can upload/update/delete your files (path: user_id/property_id/...)
CREATE POLICY "Anyone can view property images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

CREATE POLICY "Users can upload property images to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own property images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own property images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

4. Click **Run**. After that, “Upload hero image” on the property page should work.

## Option B – Create bucket in Dashboard, then add policies

1. In Supabase Dashboard go to **Storage**.
2. Click **New bucket**, name it **property-images**, set it to **Public**, then Create.
3. In **SQL Editor**, run only the four `CREATE POLICY` blocks from the script above (skip the `INSERT INTO storage.buckets` line).

Once the bucket and policies exist, try uploading the hero image again.
