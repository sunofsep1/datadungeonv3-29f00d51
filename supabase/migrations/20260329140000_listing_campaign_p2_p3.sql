-- P2/P3: listing campaign hub — people links, tasks, vendor updates, marketing + compliance fields, activity enum extensions.

-- ---------------------------------------------------------------------------
-- activity_log_type: offer + comms (for filtered timeline)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'activity_log_type' AND e.enumlabel = 'offer'
  ) THEN
    ALTER TYPE public.activity_log_type ADD VALUE 'offer';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'activity_log_type' AND e.enumlabel = 'comms'
  ) THEN
    ALTER TYPE public.activity_log_type ADD VALUE 'comms';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- listing_contact_links (role-labelled people on a campaign)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_contact_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('vendor', 'key_buyer', 'agent', 'solicitor', 'campaign_manager')),
  offer_status TEXT,
  firm_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (listing_id, contact_id, role)
);

CREATE INDEX IF NOT EXISTS idx_listing_contact_links_listing_id ON public.listing_contact_links(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_contact_links_contact_id ON public.listing_contact_links(contact_id);

ALTER TABLE public.listing_contact_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_contact_links_select" ON public.listing_contact_links;
CREATE POLICY "listing_contact_links_select" ON public.listing_contact_links
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_contact_links_insert" ON public.listing_contact_links;
CREATE POLICY "listing_contact_links_insert" ON public.listing_contact_links
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_contact_links_update" ON public.listing_contact_links;
CREATE POLICY "listing_contact_links_update" ON public.listing_contact_links
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_contact_links_delete" ON public.listing_contact_links;
CREATE POLICY "listing_contact_links_delete" ON public.listing_contact_links
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS tr_listing_contact_links_updated_at ON public.listing_contact_links;
CREATE TRIGGER tr_listing_contact_links_updated_at
  BEFORE UPDATE ON public.listing_contact_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- listing_tasks (workflow / next action)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_tasks_listing_id ON public.listing_tasks(listing_id);

ALTER TABLE public.listing_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_tasks_all" ON public.listing_tasks;
CREATE POLICY "listing_tasks_all" ON public.listing_tasks
  FOR ALL USING (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS tr_listing_tasks_updated_at ON public.listing_tasks;
CREATE TRIGGER tr_listing_tasks_updated_at
  BEFORE UPDATE ON public.listing_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- listing_vendor_updates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_vendor_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'other')),
  summary TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_vendor_updates_listing ON public.listing_vendor_updates(listing_id, sent_at DESC);

ALTER TABLE public.listing_vendor_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_vendor_updates_all" ON public.listing_vendor_updates;
CREATE POLICY "listing_vendor_updates_all" ON public.listing_vendor_updates
  FOR ALL USING (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- listings: marketing + compliance + key dates + action plan (additive)
-- ---------------------------------------------------------------------------
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS mkt_domain_status TEXT NOT NULL DEFAULT 'not_listed',
  ADD COLUMN IF NOT EXISTS mkt_realestate_status TEXT NOT NULL DEFAULT 'not_listed',
  ADD COLUMN IF NOT EXISTS mkt_photography_status TEXT NOT NULL DEFAULT 'not_booked',
  ADD COLUMN IF NOT EXISTS mkt_copywriting_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS mkt_brochure_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS mkt_social_ads_status TEXT NOT NULL DEFAULT 'not_scheduled',
  ADD COLUMN IF NOT EXISTS mkt_video_status TEXT NOT NULL DEFAULT 'not_started';

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS compliance_agency_agreement_signed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compliance_id_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compliance_form6_uploaded BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS key_date_appraisal TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS key_date_listed TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS key_date_contract TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS key_date_settlement TIMESTAMPTZ;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS action_plan_name TEXT,
  ADD COLUMN IF NOT EXISTS action_plan_progress INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vendor_update_last_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vendor_update_next_due_at TIMESTAMPTZ;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_mkt_domain_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_mkt_domain_status_check
  CHECK (mkt_domain_status IN ('not_listed', 'syncing', 'live'));

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_mkt_realestate_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_mkt_realestate_status_check
  CHECK (mkt_realestate_status IN ('not_listed', 'syncing', 'live'));

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_mkt_photography_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_mkt_photography_status_check
  CHECK (mkt_photography_status IN ('not_booked', 'booked', 'complete'));

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_mkt_copywriting_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_mkt_copywriting_status_check
  CHECK (mkt_copywriting_status IN ('draft', 'approved', 'live'));

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_mkt_brochure_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_mkt_brochure_status_check
  CHECK (mkt_brochure_status IN ('not_started', 'in_progress', 'live'));

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_mkt_social_ads_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_mkt_social_ads_status_check
  CHECK (mkt_social_ads_status IN ('not_scheduled', 'scheduled', 'running', 'paused'));

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_mkt_video_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_mkt_video_status_check
  CHECK (mkt_video_status IN ('not_started', 'in_production', 'live'));
