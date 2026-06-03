-- Add missing images (and documents) columns to properties if not present.
-- Run this in Supabase Dashboard → SQL Editor if you get:
--   "Could not find the 'images' column of 'properties' in the schema cache"

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
