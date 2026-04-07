-- Some databases have touches.user_id NOT NULL (alongside logged_by). log_touch_manual must set both.

CREATE OR REPLACE FUNCTION public.log_touch_manual(
  p_contact_id UUID,
  p_touch_type TEXT,
  p_notes TEXT DEFAULT NULL,
  p_touch_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_touch_id UUID;
  v_uid UUID := auth.uid();
  c_user_id_col BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_can_access_contact(p_contact_id) THEN
    RAISE EXCEPTION 'Contact not found or not accessible';
  END IF;

  IF p_touch_type IS NULL OR btrim(p_touch_type) = '' THEN
    RAISE EXCEPTION 'touch_type is required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'touches'
      AND column_name = 'user_id'
  )
  INTO c_user_id_col;

  IF c_user_id_col THEN
    INSERT INTO public.touches (contact_id, touch_type, notes, logged_by, user_id, touch_date)
    VALUES (
      p_contact_id,
      btrim(p_touch_type),
      NULLIF(btrim(COALESCE(p_notes, '')), ''),
      v_uid,
      v_uid,
      COALESCE(p_touch_date, NOW())
    )
    RETURNING id INTO v_touch_id;
  ELSE
    INSERT INTO public.touches (contact_id, touch_type, notes, logged_by, touch_date)
    VALUES (
      p_contact_id,
      btrim(p_touch_type),
      NULLIF(btrim(COALESCE(p_notes, '')), ''),
      v_uid,
      COALESCE(p_touch_date, NOW())
    )
    RETURNING id INTO v_touch_id;
  END IF;

  RETURN v_touch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_touch_manual(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
