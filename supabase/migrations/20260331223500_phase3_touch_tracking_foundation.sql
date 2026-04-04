-- Phase 3: touch tracking foundation + daily summary.
CREATE TABLE IF NOT EXISTS public.touches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  touch_type TEXT NOT NULL CHECK (
    touch_type IN (
      'call',
      'email',
      'sms',
      'handwritten_card',
      'break_bread',
      'pop_by',
      'housing_update_video',
      'weekly_email',
      'monthly_mailer',
      'birthday_card',
      'annual_review',
      'community_event',
      'social_media',
      'other'
    )
  ),
  notes TEXT,
  logged_by UUID NOT NULL DEFAULT auth.uid(),
  touch_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_touches_contact_touch_date
  ON public.touches (contact_id, touch_date DESC);

CREATE INDEX IF NOT EXISTS idx_touches_logged_by_touch_date
  ON public.touches (logged_by, touch_date DESC);

ALTER TABLE public.touches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "touches_select_own" ON public.touches;
CREATE POLICY "touches_select_own"
ON public.touches
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.contacts c
    WHERE c.id = touches.contact_id
      AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "touches_insert_own" ON public.touches;
CREATE POLICY "touches_insert_own"
ON public.touches
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.contacts c
    WHERE c.id = touches.contact_id
      AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "touches_update_own" ON public.touches;
CREATE POLICY "touches_update_own"
ON public.touches
FOR UPDATE
USING (logged_by = auth.uid())
WITH CHECK (logged_by = auth.uid());

DROP POLICY IF EXISTS "touches_delete_own" ON public.touches;
CREATE POLICY "touches_delete_own"
ON public.touches
FOR DELETE
USING (logged_by = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_contact_last_touch_from_touches()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.contacts
  SET
    last_touch_date = COALESCE(NEW.touch_date, NOW()),
    last_activity_at = COALESCE(NEW.touch_date, NOW())
  WHERE id = NEW.contact_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_contact_last_touch_from_touches ON public.touches;
CREATE TRIGGER trg_sync_contact_last_touch_from_touches
AFTER INSERT ON public.touches
FOR EACH ROW
EXECUTE FUNCTION public.sync_contact_last_touch_from_touches();

CREATE OR REPLACE FUNCTION public.log_touch_from_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  mapped_touch_type TEXT;
BEGIN
  mapped_touch_type := CASE lower(COALESCE(NEW.type, ''))
    WHEN 'call' THEN 'call'
    WHEN 'email' THEN 'email'
    WHEN 'sms' THEN 'sms'
    ELSE 'other'
  END;

  INSERT INTO public.touches (
    contact_id,
    touch_type,
    notes,
    logged_by,
    touch_date
  )
  VALUES (
    NEW.contact_id,
    mapped_touch_type,
    COALESCE(NEW.subject, NEW.body),
    COALESCE(NEW.user_id, auth.uid()),
    COALESCE(NEW.timestamp, NEW.created_at, NOW())
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_touch_from_interaction ON public.interactions;
CREATE TRIGGER trg_log_touch_from_interaction
AFTER INSERT ON public.interactions
FOR EACH ROW
EXECUTE FUNCTION public.log_touch_from_interaction();

DROP VIEW IF EXISTS public.daily_touch_summary;
CREATE VIEW public.daily_touch_summary AS
SELECT
  t.touch_type,
  COUNT(*)::BIGINT AS completed,
  CASE t.touch_type
    WHEN 'handwritten_card' THEN 2
    WHEN 'break_bread' THEN 1
    WHEN 'weekly_email' THEN 1
    ELSE NULL
  END AS daily_target
FROM public.touches t
WHERE t.touch_date::date = CURRENT_DATE
GROUP BY t.touch_type;

CREATE OR REPLACE FUNCTION public.get_daily_touch_summary()
RETURNS TABLE (
  touch_type TEXT,
  completed BIGINT,
  daily_target INTEGER
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    t.touch_type,
    COUNT(*)::BIGINT AS completed,
    CASE t.touch_type
      WHEN 'handwritten_card' THEN 2
      WHEN 'break_bread' THEN 1
      WHEN 'weekly_email' THEN 1
      ELSE NULL
    END::INTEGER AS daily_target
  FROM public.touches t
  JOIN public.contacts c ON c.id = t.contact_id
  WHERE t.touch_date::date = CURRENT_DATE
    AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
  GROUP BY t.touch_type
  ORDER BY t.touch_type;
$$;

NOTIFY pgrst, 'reload schema';
