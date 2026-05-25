-- Reapit upgrade brief Phase 2–3: OFI attendee depth, contact professional fields, AgentBox ID

ALTER TABLE public.listing_inspection_attendees
  ADD COLUMN IF NOT EXISTS interest_level TEXT DEFAULT 'warm'
    CHECK (interest_level IN ('hot', 'warm', 'cold', 'not_interested')),
  ADD COLUMN IF NOT EXISTS working_with_agent BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS salutation TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS home_phone TEXT,
  ADD COLUMN IF NOT EXISTS work_phone TEXT,
  ADD COLUMN IF NOT EXISTS facsimile TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS anniversary_date DATE,
  ADD COLUMN IF NOT EXISTS client_ref TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS agentbox_id INTEGER,
  ADD COLUMN IF NOT EXISTS agentbox_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_agentbox_id
  ON public.contacts(agentbox_id)
  WHERE agentbox_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ofi_check_in_attendee(
  p_token text,
  p_contact_id uuid DEFAULT NULL,
  p_guest_name text DEFAULT NULL,
  p_guest_phone text DEFAULT NULL,
  p_guest_email text DEFAULT NULL,
  p_interest_level text DEFAULT 'warm',
  p_working_with_agent boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inspection_id uuid;
  v_listing_id uuid;
  v_user_id uuid;
  v_contact_id uuid;
  v_attendee_id uuid;
  v_name text;
  v_interest text;
BEGIN
  SELECT loi.id, loi.listing_id, l.user_id
  INTO v_inspection_id, v_listing_id, v_user_id
  FROM public.listing_open_inspections loi
  JOIN public.listings l ON l.id = loi.listing_id
  WHERE trim(loi.check_in_token::text) = trim(p_token)
    AND loi.ends_at >= (now() - interval '2 hours')
  LIMIT 1;

  IF v_inspection_id IS NULL THEN
    RAISE EXCEPTION 'Inspection not found or check-in window closed';
  END IF;

  v_name := nullif(trim(p_guest_name), '');
  IF v_name IS NULL AND p_contact_id IS NULL THEN
    RAISE EXCEPTION 'Name is required';
  END IF;

  v_interest := coalesce(nullif(trim(p_interest_level), ''), 'warm');
  IF v_interest NOT IN ('hot', 'warm', 'cold', 'not_interested') THEN
    v_interest := 'warm';
  END IF;

  v_contact_id := p_contact_id;

  IF v_contact_id IS NULL AND nullif(trim(p_guest_email), '') IS NOT NULL THEN
    SELECT c.id INTO v_contact_id
    FROM public.contacts c
    WHERE c.user_id = v_user_id
      AND lower(trim(c.email)) = lower(trim(p_guest_email))
    LIMIT 1;
  END IF;

  IF v_contact_id IS NULL AND nullif(trim(p_guest_phone), '') IS NOT NULL THEN
    SELECT c.id INTO v_contact_id
    FROM public.contacts c
    WHERE c.user_id = v_user_id
      AND regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')
        = regexp_replace(trim(p_guest_phone), '[^0-9]', '', 'g')
    LIMIT 1;
  END IF;

  INSERT INTO public.listing_inspection_attendees (
    inspection_id,
    contact_id,
    guest_name,
    guest_phone,
    guest_email,
    interest_level,
    working_with_agent,
    checked_in_at
  )
  VALUES (
    v_inspection_id,
    v_contact_id,
    v_name,
    nullif(trim(p_guest_phone), ''),
    nullif(trim(p_guest_email), ''),
    v_interest,
    coalesce(p_working_with_agent, false),
    now()
  )
  RETURNING id INTO v_attendee_id;

  PERFORM public.sync_listing_inspection_kpis(v_listing_id);

  RETURN v_attendee_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ofi_check_in_attendee(text, uuid, text, text, text, text, boolean) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
