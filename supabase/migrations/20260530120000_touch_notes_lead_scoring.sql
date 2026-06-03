-- Parse touch notes and interaction text for high-intent keywords; reward recent touches.

CREATE OR REPLACE FUNCTION public.touch_text_signals_match(p_text TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_text, '') ~* '\y(appraisal|evaluation|eval|appt|appointment)s?\y';
$$;

ALTER TABLE public.lead_score_rules DROP CONSTRAINT IF EXISTS lead_score_rules_condition_type_check;

ALTER TABLE public.lead_score_rules
  ADD CONSTRAINT lead_score_rules_condition_type_check
  CHECK (
    condition_type IN (
      'property_owner',
      'sms_response',
      'open_home_attended',
      'appraisal_request',
      'past_client_referral',
      'inactive_30d_penalty',
      'recent_touch'
    )
  );

INSERT INTO public.lead_score_rules (user_id, rule_name, condition_type, points, is_active)
SELECT NULL, 'Recent touch (7 days)', 'recent_touch', 5, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_score_rules r WHERE r.user_id IS NULL AND r.condition_type = 'recent_touch'
);

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
  v_has_recent_touch BOOLEAN;
  v_referred_by_past_client BOOLEAN;
  v_days_inactive INTEGER;
  v_penalty_units INTEGER;
  v_property_pts INTEGER;
  v_sms_pts INTEGER;
  v_open_home_pts INTEGER;
  v_appraisal_pts INTEGER;
  v_recent_touch_pts INTEGER;
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
        public.touch_text_signals_match(i.subject)
        OR public.touch_text_signals_match(i.body)
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.touches t
    WHERE t.contact_id = p_contact_id
      AND public.touch_text_signals_match(t.notes)
  ) INTO v_requested_appraisal;

  SELECT EXISTS (
    SELECT 1
    FROM public.touches t
    WHERE t.contact_id = p_contact_id
      AND t.touch_date >= NOW() - INTERVAL '7 days'
  ) INTO v_has_recent_touch;

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
  v_recent_touch_pts := CASE
    WHEN v_has_recent_touch THEN public.get_lead_rule_points(v_user_id, 'recent_touch', 5)
    ELSE 0
  END;
  v_referral_pts := CASE
    WHEN v_referred_by_past_client THEN public.get_lead_rule_points(v_user_id, 'past_client_referral', 25)
    ELSE 0
  END;
  v_penalty_pts := public.get_lead_rule_points(v_user_id, 'inactive_30d_penalty', -5) * v_penalty_units;

  v_total := v_property_pts + v_sms_pts + v_open_home_pts + v_appraisal_pts + v_recent_touch_pts + v_referral_pts + v_penalty_pts;
  v_total := GREATEST(0, v_total);

  v_breakdown := jsonb_build_object(
    'property_owner_points', v_property_pts,
    'sms_response_points', v_sms_pts,
    'open_home_attended_points', v_open_home_pts,
    'appraisal_request_points', v_appraisal_pts,
    'recent_touch_points', v_recent_touch_pts,
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

-- Refresh existing scores with new rules.
DO $$
DECLARE
  v_contact RECORD;
BEGIN
  FOR v_contact IN SELECT id FROM public.contacts
  LOOP
    PERFORM public.recalculate_contact_score(v_contact.id);
  END LOOP;
END;
$$;
