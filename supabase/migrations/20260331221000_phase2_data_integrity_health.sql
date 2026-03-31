-- Phase 2: data integrity health function (user-scoped).
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
      'properties_missing_details', 0
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
    'properties_missing_details', properties_missing_details
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
