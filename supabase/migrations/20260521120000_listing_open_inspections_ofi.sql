-- OFI module: open inspections, attendees, public QR check-in RPCs, KPI sync.

-- ---------------------------------------------------------------------------
-- listing_open_inspections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_open_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  open_type TEXT NOT NULL DEFAULT 'advertised' CHECK (open_type IN ('advertised', 'by_appointment')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  check_in_token TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (check_in_token)
);

CREATE INDEX IF NOT EXISTS idx_listing_open_inspections_listing_id
  ON public.listing_open_inspections(listing_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_listing_open_inspections_token
  ON public.listing_open_inspections(check_in_token);

ALTER TABLE public.listing_open_inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_open_inspections_select" ON public.listing_open_inspections;
CREATE POLICY "listing_open_inspections_select" ON public.listing_open_inspections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_open_inspections_insert" ON public.listing_open_inspections;
CREATE POLICY "listing_open_inspections_insert" ON public.listing_open_inspections
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_open_inspections_update" ON public.listing_open_inspections;
CREATE POLICY "listing_open_inspections_update" ON public.listing_open_inspections
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_open_inspections_delete" ON public.listing_open_inspections;
CREATE POLICY "listing_open_inspections_delete" ON public.listing_open_inspections
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS tr_listing_open_inspections_updated_at ON public.listing_open_inspections;
CREATE TRIGGER tr_listing_open_inspections_updated_at
  BEFORE UPDATE ON public.listing_open_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- listing_inspection_attendees
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_inspection_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES public.listing_open_inspections(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_inspection_attendees_inspection
  ON public.listing_inspection_attendees(inspection_id, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_inspection_attendees_contact
  ON public.listing_inspection_attendees(contact_id);

ALTER TABLE public.listing_inspection_attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_inspection_attendees_select" ON public.listing_inspection_attendees;
CREATE POLICY "listing_inspection_attendees_select" ON public.listing_inspection_attendees
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.listing_open_inspections loi
      JOIN public.listings l ON l.id = loi.listing_id
      WHERE loi.id = inspection_id AND l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "listing_inspection_attendees_insert" ON public.listing_inspection_attendees;
CREATE POLICY "listing_inspection_attendees_insert" ON public.listing_inspection_attendees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.listing_open_inspections loi
      JOIN public.listings l ON l.id = loi.listing_id
      WHERE loi.id = inspection_id AND l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "listing_inspection_attendees_delete" ON public.listing_inspection_attendees;
CREATE POLICY "listing_inspection_attendees_delete" ON public.listing_inspection_attendees
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.listing_open_inspections loi
      JOIN public.listings l ON l.id = loi.listing_id
      WHERE loi.id = inspection_id AND l.user_id = auth.uid()
    )
  );

-- Attendee → prospective buyer on listing (Reapit OFI workflow)
CREATE OR REPLACE FUNCTION public.tr_inspection_attendee_prospective_buyer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id uuid;
  v_user_id uuid;
BEGIN
  IF NEW.contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT loi.listing_id, l.user_id
  INTO v_listing_id, v_user_id
  FROM public.listing_open_inspections loi
  JOIN public.listings l ON l.id = loi.listing_id
  WHERE loi.id = NEW.inspection_id;

  IF v_listing_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.listing_contact_links (listing_id, contact_id, role, user_id)
  VALUES (v_listing_id, NEW.contact_id, 'prospective_buyer', v_user_id)
  ON CONFLICT (listing_id, contact_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_inspection_attendee_prospective_buyer ON public.listing_inspection_attendees;
CREATE TRIGGER tr_inspection_attendee_prospective_buyer
  AFTER INSERT ON public.listing_inspection_attendees
  FOR EACH ROW EXECUTE FUNCTION public.tr_inspection_attendee_prospective_buyer();

-- ---------------------------------------------------------------------------
-- KPI sync
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_listing_inspection_kpis(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next timestamptz;
  v_count integer;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.listings l WHERE l.id = p_listing_id AND l.user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Listing not found';
    END IF;
  END IF;

  SELECT COUNT(*)::integer
  INTO v_count
  FROM public.listing_open_inspections
  WHERE listing_id = p_listing_id;

  SELECT MIN(starts_at)
  INTO v_next
  FROM public.listing_open_inspections
  WHERE listing_id = p_listing_id AND starts_at >= now();

  UPDATE public.listings
  SET
    campaign_inspection_count = COALESCE(v_count, 0),
    campaign_next_inspection_at = v_next
  WHERE id = p_listing_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Public check-in RPCs (anon + authenticated)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ofi_check_in_by_token(p_token text)
RETURNS TABLE (
  inspection_id uuid,
  listing_id uuid,
  listing_address text,
  starts_at timestamptz,
  ends_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    loi.id AS inspection_id,
    loi.listing_id,
    COALESCE(l.address, '') AS listing_address,
    loi.starts_at,
    loi.ends_at
  FROM public.listing_open_inspections loi
  JOIN public.listings l ON l.id = loi.listing_id
  WHERE trim(loi.check_in_token::text) = trim(p_token)
    AND loi.ends_at >= (now() - interval '2 hours')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ofi_check_in_attendee(
  p_token text,
  p_contact_id uuid DEFAULT NULL,
  p_guest_name text DEFAULT NULL,
  p_guest_phone text DEFAULT NULL,
  p_guest_email text DEFAULT NULL
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
    checked_in_at
  )
  VALUES (
    v_inspection_id,
    v_contact_id,
    v_name,
    nullif(trim(p_guest_phone), ''),
    nullif(trim(p_guest_email), ''),
    now()
  )
  RETURNING id INTO v_attendee_id;

  PERFORM public.sync_listing_inspection_kpis(v_listing_id);

  RETURN v_attendee_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ofi_check_in_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ofi_check_in_attendee(text, uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_listing_inspection_kpis(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
