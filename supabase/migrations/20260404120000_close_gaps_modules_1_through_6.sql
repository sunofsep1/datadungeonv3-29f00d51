-- Close documented gaps for roadmap priorities 1–6 (classification, touch tracking,
-- data integrity alignment notes, scripts search, lead-score defaults + nightly hook,
-- notifications: realtime, digest, nurture due, new lead, listing stage).

-- ---------------------------------------------------------------------------
-- 1) Contact classification: stale_contacts uses last_activity_at fallback and owner_id
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.stale_contacts;
CREATE VIEW public.stale_contacts AS
SELECT
  c.id,
  c.user_id,
  c.owner_id,
  c.name,
  c.contact_category,
  c.last_touch_date,
  c.next_touch_date,
  c.last_activity_at,
  EXTRACT(EPOCH FROM (NOW() - COALESCE(c.last_touch_date, c.last_activity_at))) / 86400.0
    AS days_since_last_touch
FROM public.contacts c
WHERE COALESCE(c.last_touch_date, c.last_activity_at) IS NOT NULL
  AND COALESCE(c.last_touch_date, c.last_activity_at) < NOW() - INTERVAL '14 days'
ORDER BY COALESCE(c.last_touch_date, c.last_activity_at) ASC;

-- ---------------------------------------------------------------------------
-- 2) Touch tracking: weekly summary (e.g. break-bread 5/week per playbook)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_weekly_touch_summary()
RETURNS TABLE (
  touch_type TEXT,
  completed BIGINT,
  weekly_target INTEGER
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    t.touch_type,
    COUNT(*)::BIGINT AS completed,
    CASE t.touch_type
      WHEN 'break_bread' THEN 5
      WHEN 'handwritten_card' THEN 14
      WHEN 'housing_update_video' THEN 1
      WHEN 'weekly_email' THEN 1
      ELSE NULL
    END::INTEGER AS weekly_target
  FROM public.touches t
  JOIN public.contacts c ON c.id = t.contact_id
  WHERE t.touch_date >= date_trunc('week', CURRENT_TIMESTAMP)
    AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
  GROUP BY t.touch_type
  ORDER BY t.touch_type;
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_touch_summary() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Data integrity: optional breakdown key (non-breaking for existing clients)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_data_health()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid UUID;
  total_contacts INTEGER := 0;
  contacts_missing_category INTEGER := 0;
  contacts_missing_touch INTEGER := 0;
  total_properties INTEGER := 0;
  properties_missing_details INTEGER := 0;
  total_checks INTEGER := 0;
  missing_checks INTEGER := 0;
  health_score NUMERIC := 100;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'health_score', 0,
      'total_contacts', 0,
      'contacts_missing_category', 0,
      'contacts_missing_touch_date', 0,
      'total_properties', 0,
      'properties_missing_details', 0,
      'checks_mode', 'contacts_x2_plus_properties_x4'
    );
  END IF;

  SELECT COUNT(*)
  INTO total_contacts
  FROM public.contacts c
  WHERE c.user_id = v_uid OR c.owner_id = v_uid;

  SELECT COUNT(*)
  INTO contacts_missing_category
  FROM public.contacts c
  WHERE (c.user_id = v_uid OR c.owner_id = v_uid)
    AND (c.contact_category IS NULL OR btrim(c.contact_category) = '');

  SELECT COUNT(*)
  INTO contacts_missing_touch
  FROM public.contacts c
  WHERE (c.user_id = v_uid OR c.owner_id = v_uid)
    AND c.last_touch_date IS NULL;

  SELECT COUNT(*)
  INTO total_properties
  FROM public.properties p
  WHERE p.user_id = v_uid OR p.owner_id = v_uid;

  SELECT COUNT(*)
  INTO properties_missing_details
  FROM public.properties p
  WHERE (p.user_id = v_uid OR p.owner_id = v_uid)
    AND (
      p.address_line1 IS NULL OR btrim(p.address_line1) = '' OR
      p.property_type IS NULL OR btrim(p.property_type) = '' OR
      p.bedrooms IS NULL OR
      p.bathrooms IS NULL
    );

  total_checks := (total_contacts * 2) + (total_properties * 4);
  missing_checks := contacts_missing_category + contacts_missing_touch + properties_missing_details;

  IF total_checks > 0 THEN
    health_score := ROUND((1.0 - (missing_checks::NUMERIC / total_checks::NUMERIC)) * 100.0, 0);
    health_score := GREATEST(0, LEAST(100, health_score));
  END IF;

  RETURN jsonb_build_object(
    'health_score', health_score,
    'total_contacts', total_contacts,
    'contacts_missing_category', contacts_missing_category,
    'contacts_missing_touch_date', contacts_missing_touch,
    'total_properties', total_properties,
    'properties_missing_details', properties_missing_details,
    'checks_mode', 'contacts_x2_plus_properties_x4'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Scripts: full-text search RPC (uses existing GIN index on scripts)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_scripts(p_query TEXT, p_limit INTEGER DEFAULT 30)
RETURNS SETOF public.scripts
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT s.*
  FROM public.scripts s
  WHERE s.user_id = auth.uid()
    AND s.is_active = TRUE
    AND (
      p_query IS NULL
      OR btrim(p_query) = ''
      OR to_tsvector(
        'english',
        COALESCE(s.title, '') || ' ' || COALESCE(s.situation_trigger, '') || ' ' || COALESCE(s.content, '')
      ) @@ websearch_to_tsquery('english', btrim(p_query))
    )
  ORDER BY s.updated_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.search_scripts(TEXT, INTEGER) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Lead scoring: seed global defaults (user_id NULL) so rules are visible/tunable
-- ---------------------------------------------------------------------------
INSERT INTO public.lead_score_rules (user_id, rule_name, condition_type, points, is_active)
SELECT NULL, 'Property linked', 'property_owner', 10, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_score_rules r WHERE r.user_id IS NULL AND r.condition_type = 'property_owner'
);

INSERT INTO public.lead_score_rules (user_id, rule_name, condition_type, points, is_active)
SELECT NULL, 'SMS interaction', 'sms_response', 15, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_score_rules r WHERE r.user_id IS NULL AND r.condition_type = 'sms_response'
);

INSERT INTO public.lead_score_rules (user_id, rule_name, condition_type, points, is_active)
SELECT NULL, 'Open home attended', 'open_home_attended', 20, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_score_rules r WHERE r.user_id IS NULL AND r.condition_type = 'open_home_attended'
);

INSERT INTO public.lead_score_rules (user_id, rule_name, condition_type, points, is_active)
SELECT NULL, 'Appraisal request', 'appraisal_request', 30, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_score_rules r WHERE r.user_id IS NULL AND r.condition_type = 'appraisal_request'
);

INSERT INTO public.lead_score_rules (user_id, rule_name, condition_type, points, is_active)
SELECT NULL, 'Referral source', 'past_client_referral', 25, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_score_rules r WHERE r.user_id IS NULL AND r.condition_type = 'past_client_referral'
);

INSERT INTO public.lead_score_rules (user_id, rule_name, condition_type, points, is_active)
SELECT NULL, 'Inactivity (per 30 days)', 'inactive_30d_penalty', -5, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_score_rules r WHERE r.user_id IS NULL AND r.condition_type = 'inactive_30d_penalty'
);

-- Nightly full recompute for cron/service role (all contacts).
CREATE OR REPLACE FUNCTION public.recalculate_all_contact_scores_system()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  r RECORD;
BEGIN
  FOR r IN SELECT c.id AS id FROM public.contacts c LOOP
    PERFORM public.recalculate_contact_score(r.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_all_contact_scores_system() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_all_contact_scores_system() TO service_role;

-- ---------------------------------------------------------------------------
-- 6) Notifications: Realtime publication + digest + nurture due + triggers
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.generate_nurture_step_due_notifications(p_user_id UUID DEFAULT auth.uid())
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
      e.id AS enrollment_id,
      e.contact_id,
      e.next_step_at,
      c.name AS contact_name
    FROM public.nurture_sequence_enrollments e
    JOIN public.contacts c ON c.id = e.contact_id
    WHERE e.user_id = v_uid
      AND e.completed_at IS NULL
      AND e.next_step_at IS NOT NULL
      AND e.next_step_at < NOW()
  LOOP
    PERFORM public.create_notification(
      p_user_id := v_uid,
      p_kind := 'nurture_step_due',
      p_priority := 'action_required',
      p_title := 'Nurture step due: ' || COALESCE(v_row.contact_name, 'Contact'),
      p_body := 'Next step was due ' || to_char(v_row.next_step_at AT TIME ZONE 'UTC', 'Mon DD, HH24:MI') || ' UTC.',
      p_action_url := '/contacts/' || v_row.contact_id::TEXT || '?nurtureFocus=1',
      p_action_label := 'Open nurture',
      p_related_contact_id := v_row.contact_id,
      p_entity_type := 'nurture_enrollment',
      p_entity_id := v_row.enrollment_id,
      p_event_key := 'nurture_due:' || v_row.enrollment_id::TEXT || ':' || CURRENT_DATE::TEXT
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_notification_digest_for_current_user()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stale INTEGER;
  v_tasks INTEGER;
  v_nurture INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'stale_contact_notifications', 0,
      'overdue_task_notifications', 0,
      'nurture_due_notifications', 0
    );
  END IF;

  SELECT public.generate_stale_contact_notifications(auth.uid()) INTO v_stale;
  SELECT public.generate_overdue_task_notifications(auth.uid()) INTO v_tasks;
  SELECT public.generate_nurture_step_due_notifications(auth.uid()) INTO v_nurture;

  RETURN jsonb_build_object(
    'stale_contact_notifications', v_stale,
    'overdue_task_notifications', v_tasks,
    'nurture_due_notifications', v_nurture
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_notification_digest_for_current_user() TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_notify_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_notification(
    p_user_id := NEW.user_id,
    p_kind := 'new_lead',
    p_priority := 'info',
    p_title := 'New lead: ' || COALESCE(btrim(NEW.name), 'Lead'),
    p_body := NULLIF(trim(COALESCE(NEW.source, '') || CASE WHEN NEW.property_interest IS NOT NULL AND btrim(NEW.property_interest) <> '' THEN ' · ' || NEW.property_interest ELSE '' END), ''),
    p_action_url := '/contacts',
    p_action_label := 'View contacts',
    p_entity_type := 'lead',
    p_entity_id := NEW.id,
    p_event_key := 'new_lead:' || NEW.id::TEXT
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_lead ON public.leads;
CREATE TRIGGER trg_notify_new_lead
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_new_lead();

CREATE OR REPLACE FUNCTION public.trg_notify_listing_pipeline_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  IF NEW.pipeline_stage IS NOT DISTINCT FROM OLD.pipeline_stage THEN
    RETURN NEW;
  END IF;

  PERFORM public.create_notification(
    p_user_id := NEW.user_id,
    p_kind := 'listing_stage_change',
    p_priority := 'info',
    p_title := 'Listing stage updated',
    p_body := COALESCE(NEW.address, 'Listing') || ' → ' || COALESCE(NEW.pipeline_stage, 'updated'),
    p_action_url := '/listings/' || NEW.id::TEXT,
    p_action_label := 'View listing',
    p_related_listing_id := NEW.id,
    p_related_contact_id := NEW.contact_id,
    p_entity_type := 'listing',
    p_entity_id := NEW.id,
    p_event_key := 'listing_stage:' || NEW.id::TEXT || ':' || COALESCE(NEW.pipeline_stage, '') || ':' || CURRENT_DATE::TEXT
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_listing_pipeline_stage_change ON public.listings;
CREATE TRIGGER trg_notify_listing_pipeline_stage_change
AFTER UPDATE OF pipeline_stage ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_listing_pipeline_stage_change();

NOTIFY pgrst, 'reload schema';
