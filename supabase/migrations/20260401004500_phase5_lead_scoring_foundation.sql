-- Phase 5: lead scoring backend foundation.
CREATE TABLE IF NOT EXISTS public.lead_score_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  rule_name TEXT NOT NULL,
  condition_type TEXT NOT NULL CHECK (
    condition_type IN (
      'property_owner',
      'sms_response',
      'open_home_attended',
      'appraisal_request',
      'past_client_referral',
      'inactive_30d_penalty'
    )
  ),
  points INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contact_scores (
  contact_id UUID PRIMARY KEY REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_calculated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_score_rules_user_active
  ON public.lead_score_rules(user_id, is_active, condition_type);

CREATE INDEX IF NOT EXISTS idx_contact_scores_user_score
  ON public.contact_scores(user_id, total_score DESC, last_calculated DESC);

ALTER TABLE public.lead_score_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_score_rules_select" ON public.lead_score_rules;
CREATE POLICY "lead_score_rules_select"
ON public.lead_score_rules
FOR SELECT
USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "lead_score_rules_insert" ON public.lead_score_rules;
CREATE POLICY "lead_score_rules_insert"
ON public.lead_score_rules
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lead_score_rules_update" ON public.lead_score_rules;
CREATE POLICY "lead_score_rules_update"
ON public.lead_score_rules
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lead_score_rules_delete" ON public.lead_score_rules;
CREATE POLICY "lead_score_rules_delete"
ON public.lead_score_rules
FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "contact_scores_select" ON public.contact_scores;
CREATE POLICY "contact_scores_select"
ON public.contact_scores
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "contact_scores_insert" ON public.contact_scores;
CREATE POLICY "contact_scores_insert"
ON public.contact_scores
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "contact_scores_update" ON public.contact_scores;
CREATE POLICY "contact_scores_update"
ON public.contact_scores
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "contact_scores_delete" ON public.contact_scores;
CREATE POLICY "contact_scores_delete"
ON public.contact_scores
FOR DELETE
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_lead_rule_points(
  p_user_id UUID,
  p_condition_type TEXT,
  p_default INTEGER
)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  WITH matching AS (
    SELECT points, 2 AS priority, created_at
    FROM public.lead_score_rules
    WHERE user_id = p_user_id
      AND condition_type = p_condition_type
      AND is_active = TRUE
    UNION ALL
    SELECT points, 1 AS priority, created_at
    FROM public.lead_score_rules
    WHERE user_id IS NULL
      AND condition_type = p_condition_type
      AND is_active = TRUE
  )
  SELECT COALESCE(
    (SELECT points
     FROM matching
     ORDER BY priority DESC, created_at DESC
     LIMIT 1),
    p_default
  );
$$;

CREATE OR REPLACE FUNCTION public.recalculate_contact_score(p_contact_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact public.contacts%ROWTYPE;
  v_user_id UUID;
  v_has_property BOOLEAN;
  v_has_sms BOOLEAN;
  v_attended_open_home BOOLEAN;
  v_requested_appraisal BOOLEAN;
  v_referred_by_past_client BOOLEAN;
  v_days_inactive INTEGER;
  v_penalty_units INTEGER;
  v_property_pts INTEGER;
  v_sms_pts INTEGER;
  v_open_home_pts INTEGER;
  v_appraisal_pts INTEGER;
  v_referral_pts INTEGER;
  v_penalty_pts INTEGER;
  v_total INTEGER;
  v_breakdown JSONB;
  v_next_temperature TEXT;
BEGIN
  SELECT *
  INTO v_contact
  FROM public.contacts c
  WHERE c.id = p_contact_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_user_id := COALESCE(v_contact.user_id, v_contact.owner_id);
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.contact_property_links cpl
    WHERE cpl.contact_id = p_contact_id
  ) INTO v_has_property;

  SELECT EXISTS (
    SELECT 1
    FROM public.interactions i
    WHERE i.contact_id = p_contact_id
      AND lower(COALESCE(i.type, '')) = 'sms'
  ) INTO v_has_sms;

  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.contact_id = p_contact_id
      AND lower(COALESCE(a.type, '')) IN ('open_home', 'open-home', 'openhome')
      AND lower(COALESCE(a.status, '')) IN ('completed', 'attended', 'done', 'confirmed')
  ) INTO v_attended_open_home;

  SELECT EXISTS (
    SELECT 1
    FROM public.interactions i
    WHERE i.contact_id = p_contact_id
      AND (
        lower(COALESCE(i.subject, '')) LIKE '%appraisal%'
        OR lower(COALESCE(i.body, '')) LIKE '%appraisal%'
      )
  ) INTO v_requested_appraisal;

  v_referred_by_past_client := lower(COALESCE(v_contact.source, '')) LIKE '%referral%';

  v_days_inactive := FLOOR(
    EXTRACT(EPOCH FROM (NOW() - COALESCE(v_contact.last_touch_date, v_contact.last_activity_at, v_contact.created_at)))
    / 86400.0
  );
  v_penalty_units := GREATEST(0, FLOOR(v_days_inactive / 30.0));

  v_property_pts := CASE
    WHEN v_has_property THEN public.get_lead_rule_points(v_user_id, 'property_owner', 10)
    ELSE 0
  END;
  v_sms_pts := CASE
    WHEN v_has_sms THEN public.get_lead_rule_points(v_user_id, 'sms_response', 15)
    ELSE 0
  END;
  v_open_home_pts := CASE
    WHEN v_attended_open_home THEN public.get_lead_rule_points(v_user_id, 'open_home_attended', 20)
    ELSE 0
  END;
  v_appraisal_pts := CASE
    WHEN v_requested_appraisal THEN public.get_lead_rule_points(v_user_id, 'appraisal_request', 30)
    ELSE 0
  END;
  v_referral_pts := CASE
    WHEN v_referred_by_past_client THEN public.get_lead_rule_points(v_user_id, 'past_client_referral', 25)
    ELSE 0
  END;
  v_penalty_pts := public.get_lead_rule_points(v_user_id, 'inactive_30d_penalty', -5) * v_penalty_units;

  v_total := v_property_pts + v_sms_pts + v_open_home_pts + v_appraisal_pts + v_referral_pts + v_penalty_pts;
  v_total := GREATEST(0, v_total);

  v_breakdown := jsonb_build_object(
    'property_owner_points', v_property_pts,
    'sms_response_points', v_sms_pts,
    'open_home_attended_points', v_open_home_pts,
    'appraisal_request_points', v_appraisal_pts,
    'past_client_referral_points', v_referral_pts,
    'inactive_days', v_days_inactive,
    'inactive_30d_units', v_penalty_units,
    'inactivity_penalty_points', v_penalty_pts
  );

  INSERT INTO public.contact_scores (
    contact_id,
    user_id,
    total_score,
    score_breakdown,
    last_calculated
  )
  VALUES (
    p_contact_id,
    v_user_id,
    v_total,
    v_breakdown,
    NOW()
  )
  ON CONFLICT (contact_id)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    total_score = EXCLUDED.total_score,
    score_breakdown = EXCLUDED.score_breakdown,
    last_calculated = EXCLUDED.last_calculated;

  v_next_temperature := CASE
    WHEN v_total >= 61 THEN 'LEAD_HOT'
    WHEN v_total >= 31 THEN 'LEAD_WARM'
    ELSE 'LEAD_COLD'
  END;

  UPDATE public.contacts c
  SET lead_temperature = v_next_temperature
  WHERE c.id = p_contact_id
    AND COALESCE(c.classification_meta -> 'lead_temperature' ->> 'source', 'derived') <> 'manual';

  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_lead_scores(p_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_count INTEGER := 0;
  v_contact RECORD;
BEGIN
  v_uid := COALESCE(p_user_id, auth.uid());
  IF v_uid IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_contact IN
    SELECT c.id
    FROM public.contacts c
    WHERE c.user_id = v_uid OR c.owner_id = v_uid
  LOOP
    PERFORM public.recalculate_contact_score(v_contact.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_my_lead_scores()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.recalculate_lead_scores(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.trg_recalculate_contact_score_from_interactions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.recalculate_contact_score(NEW.contact_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_contact_score_from_interactions ON public.interactions;
CREATE TRIGGER trg_recalculate_contact_score_from_interactions
AFTER INSERT ON public.interactions
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_contact_score_from_interactions();

CREATE OR REPLACE FUNCTION public.trg_recalculate_contact_score_from_touches()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.recalculate_contact_score(NEW.contact_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_contact_score_from_touches ON public.touches;
CREATE TRIGGER trg_recalculate_contact_score_from_touches
AFTER INSERT ON public.touches
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_contact_score_from_touches();

CREATE OR REPLACE FUNCTION public.trg_recalculate_contact_score_from_contact_property_links()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_contact_score(OLD.contact_id);
    RETURN OLD;
  END IF;

  PERFORM public.recalculate_contact_score(NEW.contact_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_contact_score_from_contact_property_links ON public.contact_property_links;
CREATE TRIGGER trg_recalculate_contact_score_from_contact_property_links
AFTER INSERT OR DELETE ON public.contact_property_links
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_contact_score_from_contact_property_links();

CREATE OR REPLACE FUNCTION public.trg_recalculate_contact_score_from_contacts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.recalculate_contact_score(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_contact_score_from_contacts ON public.contacts;
CREATE TRIGGER trg_recalculate_contact_score_from_contacts
AFTER UPDATE OF source, last_touch_date, last_activity_at, classification_meta ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_contact_score_from_contacts();

NOTIFY pgrst, 'reload schema';
