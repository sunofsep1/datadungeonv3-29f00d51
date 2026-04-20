-- Saved views for Contacts / Tasks list state (per-user).
-- Safe if table already exists from an older schema sync.

CREATE TABLE IF NOT EXISTS public.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  object_type text NOT NULL CHECK (object_type IN ('contacts', 'tasks')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_by text,
  sort_direction text,
  visible_columns jsonb,
  is_default boolean DEFAULT false,
  visibility text DEFAULT 'private'
);

CREATE INDEX IF NOT EXISTS saved_views_owner_type_idx ON public.saved_views (owner_id, object_type);

ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_views_select_own" ON public.saved_views;
DROP POLICY IF EXISTS "saved_views_insert_own" ON public.saved_views;
DROP POLICY IF EXISTS "saved_views_update_own" ON public.saved_views;
DROP POLICY IF EXISTS "saved_views_delete_own" ON public.saved_views;

CREATE POLICY "saved_views_select_own" ON public.saved_views FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "saved_views_insert_own" ON public.saved_views FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "saved_views_update_own" ON public.saved_views FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "saved_views_delete_own" ON public.saved_views FOR DELETE USING (auth.uid() = owner_id);
