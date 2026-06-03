-- Phase 8: Annual real estate review + community events (backend recommendations §6).

-- ---------------------------------------------------------------------------
-- annual_reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.annual_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts (id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  scheduled_date DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'scheduled',
        'confirmed',
        'completed',
        'cancelled',
        'rescheduled'
      )
    ),
  loan_officer_partner TEXT,
  insurance_partner TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, contact_id, year)
);

CREATE INDEX IF NOT EXISTS idx_annual_reviews_user_year
  ON public.annual_reviews (user_id, year, scheduled_date);

-- ---------------------------------------------------------------------------
-- review_prep_checklist
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_prep_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_review_id UUID NOT NULL REFERENCES public.annual_reviews (id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (annual_review_id, item)
);

CREATE INDEX IF NOT EXISTS idx_review_prep_checklist_review
  ON public.review_prep_checklist (annual_review_id);

-- Seed default prep rows when a review is created
CREATE OR REPLACE FUNCTION public.trg_seed_review_prep_checklist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.review_prep_checklist (annual_review_id, item)
  VALUES
    (NEW.id, 'mortgage_statement'),
    (NEW.id, 'escrow_statement'),
    (NEW.id, 'insurance_dec_page'),
    (NEW.id, 'credit_review_permission'),
    (NEW.id, 'cma_prepared')
  ON CONFLICT (annual_review_id, item) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_annual_reviews_seed_prep ON public.annual_reviews;
CREATE TRIGGER trg_annual_reviews_seed_prep
  AFTER INSERT ON public.annual_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_seed_review_prep_checklist();

DROP TRIGGER IF EXISTS trg_annual_reviews_updated_at ON public.annual_reviews;
CREATE TRIGGER trg_annual_reviews_updated_at
  BEFORE UPDATE ON public.annual_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- community_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  quarter INTEGER CHECK (quarter IS NULL OR quarter IN (1, 2, 3, 4)),
  year INTEGER NOT NULL,
  location TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'scheduled', 'live', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_events_user_date
  ON public.community_events (user_id, event_date DESC);

DROP TRIGGER IF EXISTS trg_community_events_updated_at ON public.community_events;
CREATE TRIGGER trg_community_events_updated_at
  BEFORE UPDATE ON public.community_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- event_invites
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.community_events (id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts (id) ON DELETE CASCADE,
  rsvp_status TEXT NOT NULL DEFAULT 'invited'
    CHECK (rsvp_status IN ('invited', 'confirmed', 'declined', 'attended', 'no_show')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE (event_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_event_invites_event ON public.event_invites (event_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.annual_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_prep_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS annual_reviews_select ON public.annual_reviews;
DROP POLICY IF EXISTS annual_reviews_insert ON public.annual_reviews;
DROP POLICY IF EXISTS annual_reviews_update ON public.annual_reviews;
DROP POLICY IF EXISTS annual_reviews_delete ON public.annual_reviews;
DROP POLICY IF EXISTS review_prep_checklist_all ON public.review_prep_checklist;
DROP POLICY IF EXISTS community_events_select ON public.community_events;
DROP POLICY IF EXISTS community_events_insert ON public.community_events;
DROP POLICY IF EXISTS community_events_update ON public.community_events;
DROP POLICY IF EXISTS community_events_delete ON public.community_events;
DROP POLICY IF EXISTS event_invites_all ON public.event_invites;

CREATE POLICY annual_reviews_select ON public.annual_reviews
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY annual_reviews_insert ON public.annual_reviews
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_id
        AND auth.uid() = COALESCE(c.user_id, c.owner_id)
    )
  );

CREATE POLICY annual_reviews_update ON public.annual_reviews
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY annual_reviews_delete ON public.annual_reviews
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY review_prep_checklist_all ON public.review_prep_checklist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.annual_reviews r
      WHERE r.id = annual_review_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.annual_reviews r
      WHERE r.id = annual_review_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY community_events_select ON public.community_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY community_events_insert ON public.community_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY community_events_update ON public.community_events
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY community_events_delete ON public.community_events
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY event_invites_all ON public.event_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.community_events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_id
        AND auth.uid() = COALESCE(c.user_id, c.owner_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Seed January weekday slots for Top 100 + Past Clients (up to p_max reviews)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_january_annual_reviews(
  p_year INTEGER,
  p_max INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER := 0;
BEGIN
  IF p_year < 2000 OR p_year > 2100 THEN
    RAISE EXCEPTION 'Invalid year';
  END IF;
  IF p_max < 1 OR p_max > 100 THEN
    RAISE EXCEPTION 'p_max must be between 1 and 100';
  END IF;

  WITH weekdays AS (
    SELECT
      gs::date AS dt,
      ROW_NUMBER() OVER (ORDER BY gs) AS rn
    FROM generate_series(
      (DATE_TRUNC('day', make_date(p_year, 1, 1)::timestamp))::timestamp,
      (DATE_TRUNC('day', make_date(p_year, 1, 31)::timestamp))::timestamp,
      INTERVAL '1 day'
    ) gs
    WHERE EXTRACT(ISODOW FROM gs::date) <= 5
  ),
  candidates AS (
    SELECT
      c.id AS contact_id,
      ROW_NUMBER() OVER (
        ORDER BY c.last_name NULLS LAST, c.first_name NULLS LAST, c.id
      ) AS rn
    FROM public.contacts c
    WHERE COALESCE(c.user_id, c.owner_id) = auth.uid()
      AND c.contact_category IN ('top_100', 'past_client')
  ),
  pairs AS (
    SELECT w.dt, cand.contact_id
    FROM weekdays w
    INNER JOIN candidates cand ON cand.rn = w.rn
    WHERE cand.rn <= p_max
  )
  INSERT INTO public.annual_reviews (user_id, contact_id, year, scheduled_date, status)
  SELECT auth.uid(), p.contact_id, p_year, p.dt, 'pending'
  FROM pairs p
  ON CONFLICT (user_id, contact_id, year) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'year', p_year,
    'reviews_created', v_inserted,
    'timestamp', now()::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_january_annual_reviews(INTEGER, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
