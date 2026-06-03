-- Phase 4: Scripts library backend foundation.
CREATE TABLE IF NOT EXISTS public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN (
      'listing_presentation',
      'objection_handling',
      'follow_up',
      'cold_call',
      'price_reduction',
      'commission_defence',
      'appraisal_booking',
      'annual_review',
      'text_template',
      'other'
    )
  ),
  situation_trigger TEXT,
  content TEXT NOT NULL,
  psychology_note TEXT,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scripts_user_created
  ON public.scripts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scripts_user_active
  ON public.scripts(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_scripts_search
  ON public.scripts
  USING GIN (
    to_tsvector(
      'english',
      COALESCE(title, '') || ' ' || COALESCE(situation_trigger, '') || ' ' || COALESCE(content, '')
    )
  );

DROP TRIGGER IF EXISTS trg_scripts_set_updated_at ON public.scripts;
CREATE TRIGGER trg_scripts_set_updated_at
BEFORE UPDATE ON public.scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scripts_select" ON public.scripts;
CREATE POLICY "scripts_select"
ON public.scripts
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scripts_insert" ON public.scripts;
CREATE POLICY "scripts_insert"
ON public.scripts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scripts_update" ON public.scripts;
CREATE POLICY "scripts_update"
ON public.scripts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scripts_delete" ON public.scripts;
CREATE POLICY "scripts_delete"
ON public.scripts
FOR DELETE
USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
