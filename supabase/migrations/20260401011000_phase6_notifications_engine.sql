-- Phase 6: event-driven notifications engine.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS action_label TEXT,
  ADD COLUMN IF NOT EXISTS related_contact_id UUID,
  ADD COLUMN IF NOT EXISTS related_listing_id UUID,
  ADD COLUMN IF NOT EXISTS event_key TEXT;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_priority_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_priority_check
  CHECK (priority IN ('urgent', 'action_required', 'info'));

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_priority
  ON public.notifications(user_id, read_at, priority, created_at DESC)
  WHERE read_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_event_key_unique
  ON public.notifications(user_id, event_key)
  WHERE event_key IS NOT NULL;

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

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_stale_contact_notifications(p_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_count INTEGER := 0;
  v_row RECORD;
BEGIN
  v_uid := COALESCE(p_user_id, auth.uid());
  IF v_uid IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_row IN
    SELECT
      c.id,
      c.name,
      FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(c.last_touch_date, c.last_activity_at, c.created_at))) / 86400.0)::INT AS days_stale
    FROM public.contacts c
    WHERE (c.user_id = v_uid OR c.owner_id = v_uid)
      AND COALESCE(c.last_touch_date, c.last_activity_at, c.created_at) < NOW() - INTERVAL '14 days'
      AND c.contact_category IN ('top_100', 'past_client', 'hot_lead')
  LOOP
    PERFORM public.create_notification(
      p_user_id := v_uid,
      p_kind := 'stale_contact',
      p_priority := 'action_required',
      p_title := 'Contact going cold: ' || COALESCE(v_row.name, 'Contact'),
      p_body := 'Last touch was ' || v_row.days_stale::TEXT || ' days ago.',
      p_action_url := '/contacts/' || v_row.id::TEXT,
      p_action_label := 'Call now',
      p_related_contact_id := v_row.id,
      p_entity_type := 'contact',
      p_entity_id := v_row.id,
      p_event_key := 'stale_contact:' || v_row.id::TEXT || ':' || CURRENT_DATE::TEXT
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_hot_lead_score_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_user_id UUID;
BEGIN
  IF NEW.total_score < 61 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.total_score, 0) >= 61 THEN
    RETURN NEW;
  END IF;

  SELECT c.name, COALESCE(c.user_id, c.owner_id)
  INTO v_name, v_user_id
  FROM public.contacts c
  WHERE c.id = NEW.contact_id;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.create_notification(
    p_user_id := v_user_id,
    p_kind := 'score_change',
    p_priority := 'urgent',
    p_title := 'Hot lead unlocked: ' || COALESCE(v_name, 'Contact'),
    p_body := 'Lead score is now ' || NEW.total_score::TEXT || '.',
    p_action_url := '/contacts/' || NEW.contact_id::TEXT,
    p_action_label := 'View contact',
    p_related_contact_id := NEW.contact_id,
    p_entity_type := 'contact',
    p_entity_id := NEW.contact_id,
    p_event_key := 'hot_lead:' || NEW.contact_id::TEXT || ':' || CURRENT_DATE::TEXT
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_hot_lead_score_change ON public.contact_scores;
CREATE TRIGGER trg_notify_hot_lead_score_change
AFTER INSERT OR UPDATE OF total_score ON public.contact_scores
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_hot_lead_score_change();

CREATE OR REPLACE FUNCTION public.generate_overdue_task_notifications(p_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_count INTEGER := 0;
  v_row RECORD;
BEGIN
  v_uid := COALESCE(p_user_id, auth.uid());
  IF v_uid IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_row IN
    SELECT
      t.id,
      t.title,
      t.contact_id,
      c.name AS contact_name
    FROM public.contact_tasks t
    JOIN public.contacts c ON c.id = t.contact_id
    WHERE t.user_id = v_uid
      AND t.completed_at IS NULL
      AND t.due_at IS NOT NULL
      AND t.due_at < NOW()
  LOOP
    PERFORM public.create_notification(
      p_user_id := v_uid,
      p_kind := 'task_overdue',
      p_priority := 'action_required',
      p_title := 'Overdue task: ' || COALESCE(v_row.title, 'Task'),
      p_body := COALESCE(v_row.contact_name, 'Contact') || ' needs follow-up.',
      p_action_url := '/contacts/' || v_row.contact_id::TEXT,
      p_action_label := 'Open contact',
      p_related_contact_id := v_row.contact_id,
      p_entity_type := 'contact_task',
      p_entity_id := v_row.id,
      p_event_key := 'task_overdue:' || v_row.id::TEXT || ':' || CURRENT_DATE::TEXT
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

NOTIFY pgrst, 'reload schema';
