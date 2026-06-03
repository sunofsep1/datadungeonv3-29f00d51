-- Fix notification conflicts on repeated listing stage changes.
-- Root cause:
--   idx_notifications_unique_nurture_step_due was created with only
--   (user_id, kind, entity_type, entity_id) and no kind filter, so it also
--   blocked repeated listing_stage_change notifications for the same listing.
--
-- Goals:
-- 1) Scope that index to nurture_step_due only.
-- 2) Make create_notification resilient to any remaining unique collisions.

DROP INDEX IF EXISTS public.idx_notifications_unique_nurture_step_due;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_nurture_step_due
  ON public.notifications(user_id, kind, entity_type, entity_id)
  WHERE kind = 'nurture_step_due' AND entity_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_kind TEXT,
  p_priority TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL,
  p_related_contact_id UUID DEFAULT NULL,
  p_related_listing_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_event_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  BEGIN
    INSERT INTO public.notifications (
      user_id,
      kind,
      priority,
      title,
      body,
      action_url,
      action_label,
      related_contact_id,
      related_listing_id,
      entity_type,
      entity_id,
      event_key
    )
    VALUES (
      p_user_id,
      p_kind,
      COALESCE(p_priority, 'info'),
      p_title,
      p_body,
      p_action_url,
      p_action_label,
      p_related_contact_id,
      p_related_listing_id,
      p_entity_type,
      p_entity_id,
      p_event_key
    )
    ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_id;
  EXCEPTION
    WHEN unique_violation THEN
      -- A different unique index matched (e.g. intentional dedupe keys).
      -- Do not fail caller-side business actions (like listing stage updates).
      v_id := NULL;
  END;

  RETURN v_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
