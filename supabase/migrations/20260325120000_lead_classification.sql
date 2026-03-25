-- Lead / prospect classification (role, timeframe, temperature, journey, relationship)
-- Text + CHECK constraints (easier to extend than Postgres enums).

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS role_category text,
  ADD COLUMN IF NOT EXISTS timeframe_category text NOT NULL DEFAULT 'TIMEFRAME_UNKNOWN',
  ADD COLUMN IF NOT EXISTS lead_temperature text NOT NULL DEFAULT 'LEAD_COLD',
  ADD COLUMN IF NOT EXISTS journey_stage text,
  ADD COLUMN IF NOT EXISTS relationship_category text,
  ADD COLUMN IF NOT EXISTS classification_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_role_category_check;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_role_category_check CHECK (
  role_category IS NULL OR role_category IN (
    'SELLER_OWNER_OCCUPIER', 'SELLER_INVESTOR', 'SELLER_DISTRESSED',
    'BUYER_FIRST_HOME', 'BUYER_UPGRADER', 'BUYER_DOWNSIZER', 'BUYER_INVESTOR',
    'LANDLORD', 'TENANT', 'REFERRAL_PARTNER', 'PAST_CLIENT_SELLER', 'PAST_CLIENT_BUYER'
  )
);

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_timeframe_category_check;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_timeframe_category_check CHECK (
  timeframe_category IN (
    'TIMEFRAME_0_3_MONTHS', 'TIMEFRAME_3_6_MONTHS', 'TIMEFRAME_6_12_MONTHS',
    'TIMEFRAME_12_24_MONTHS', 'TIMEFRAME_24_PLUS_MONTHS', 'TIMEFRAME_UNKNOWN'
  )
);

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_lead_temperature_check;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_lead_temperature_check CHECK (
  lead_temperature IN ('LEAD_HOT', 'LEAD_WARM', 'LEAD_COLD', 'LEAD_ARCHIVED')
);

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_journey_stage_check;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_journey_stage_check CHECK (
  journey_stage IS NULL OR journey_stage IN (
    'SELLER_LONG_TERM', 'SELLER_CONSIDERING', 'SELLER_PREP', 'SELLER_GO_LIVE_PREP',
    'SELLER_ON_MARKET', 'SELLER_ON_MARKET_OTHER_AGENT', 'SELLER_NEGOTIATION',
    'SELLER_UNDER_CONTRACT_CONDITIONAL', 'SELLER_UNDER_CONTRACT_UNCONDITIONAL',
    'SELLER_SETTLED_RECENT', 'SELLER_PAST_CLIENT',
    'BUYER_LONG_TERM_AWARENESS', 'BUYER_CONSIDERATION', 'BUYER_PREPARATION',
    'BUYER_ACTIVE_SEARCH', 'BUYER_NEGOTIATION',
    'BUYER_UNDER_CONTRACT_CONDITIONAL', 'BUYER_UNDER_CONTRACT_UNCONDITIONAL',
    'BUYER_SETTLED_RECENT', 'BUYER_PAST_CLIENT'
  )
);

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_relationship_category_check;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_relationship_category_check CHECK (
  relationship_category IS NULL OR relationship_category IN (
    'REL_NEW_ONLINE_LEAD', 'REL_OPEN_HOME_ATTENDEE', 'REL_DIRECT_ENQUIRY',
    'REL_PAST_CLIENT', 'REL_SPHERE_OF_INFLUENCE', 'REL_REFERRAL_FROM_CLIENT',
    'REL_REFERRAL_FROM_PARTNER', 'REL_LOCAL_BUSINESS', 'REL_OTHER'
  )
);

COMMENT ON COLUMN public.contacts.classification_meta IS 'e.g. {"lead_temperature":{"source":"manual"}} — source derived|manual per field';

-- Best-effort backfill from legacy lead_status / flags
UPDATE public.contacts
SET lead_temperature = 'LEAD_ARCHIVED'
WHERE COALESCE(do_not_contact, false) = true;

UPDATE public.contacts
SET lead_temperature = CASE
  WHEN lower(coalesce(lead_status, '')) IN ('hot', 'qualified') THEN 'LEAD_HOT'
  WHEN lower(coalesce(lead_status, '')) IN ('warm', 'contacted') THEN 'LEAD_WARM'
  WHEN lower(coalesce(lead_status, '')) IN ('cold', 'nurture', 'unqualified') THEN 'LEAD_COLD'
  ELSE lead_temperature
END
WHERE lead_status IS NOT NULL AND COALESCE(do_not_contact, false) = false;

UPDATE public.contacts
SET relationship_category = 'REL_PAST_CLIENT'
WHERE lower(coalesce(lifecycle_stage, '')) LIKE '%customer%' OR lower(coalesce(lifecycle_stage, '')) LIKE '%past%'
  AND relationship_category IS NULL;

-- ---------------------------------------------------------------------------
-- listings (pipeline / property deals)
-- ---------------------------------------------------------------------------
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS role_category text,
  ADD COLUMN IF NOT EXISTS timeframe_category text NOT NULL DEFAULT 'TIMEFRAME_UNKNOWN',
  ADD COLUMN IF NOT EXISTS lead_temperature text NOT NULL DEFAULT 'LEAD_COLD',
  ADD COLUMN IF NOT EXISTS journey_stage text,
  ADD COLUMN IF NOT EXISTS relationship_category text,
  ADD COLUMN IF NOT EXISTS classification_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_role_category_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_role_category_check CHECK (
  role_category IS NULL OR role_category IN (
    'SELLER_OWNER_OCCUPIER', 'SELLER_INVESTOR', 'SELLER_DISTRESSED',
    'BUYER_FIRST_HOME', 'BUYER_UPGRADER', 'BUYER_DOWNSIZER', 'BUYER_INVESTOR',
    'LANDLORD', 'TENANT', 'REFERRAL_PARTNER', 'PAST_CLIENT_SELLER', 'PAST_CLIENT_BUYER'
  )
);

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_timeframe_category_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_timeframe_category_check CHECK (
  timeframe_category IN (
    'TIMEFRAME_0_3_MONTHS', 'TIMEFRAME_3_6_MONTHS', 'TIMEFRAME_6_12_MONTHS',
    'TIMEFRAME_12_24_MONTHS', 'TIMEFRAME_24_PLUS_MONTHS', 'TIMEFRAME_UNKNOWN'
  )
);

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_lead_temperature_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_lead_temperature_check CHECK (
  lead_temperature IN ('LEAD_HOT', 'LEAD_WARM', 'LEAD_COLD', 'LEAD_ARCHIVED')
);

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_journey_stage_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_journey_stage_check CHECK (
  journey_stage IS NULL OR journey_stage IN (
    'SELLER_LONG_TERM', 'SELLER_CONSIDERING', 'SELLER_PREP', 'SELLER_GO_LIVE_PREP',
    'SELLER_ON_MARKET', 'SELLER_ON_MARKET_OTHER_AGENT', 'SELLER_NEGOTIATION',
    'SELLER_UNDER_CONTRACT_CONDITIONAL', 'SELLER_UNDER_CONTRACT_UNCONDITIONAL',
    'SELLER_SETTLED_RECENT', 'SELLER_PAST_CLIENT',
    'BUYER_LONG_TERM_AWARENESS', 'BUYER_CONSIDERATION', 'BUYER_PREPARATION',
    'BUYER_ACTIVE_SEARCH', 'BUYER_NEGOTIATION',
    'BUYER_UNDER_CONTRACT_CONDITIONAL', 'BUYER_UNDER_CONTRACT_UNCONDITIONAL',
    'BUYER_SETTLED_RECENT', 'BUYER_PAST_CLIENT'
  )
);

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_relationship_category_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_relationship_category_check CHECK (
  relationship_category IS NULL OR relationship_category IN (
    'REL_NEW_ONLINE_LEAD', 'REL_OPEN_HOME_ATTENDEE', 'REL_DIRECT_ENQUIRY',
    'REL_PAST_CLIENT', 'REL_SPHERE_OF_INFLUENCE', 'REL_REFERRAL_FROM_CLIENT',
    'REL_REFERRAL_FROM_PARTNER', 'REL_LOCAL_BUSINESS', 'REL_OTHER'
  )
);

-- ---------------------------------------------------------------------------
-- deals (if table exists in this project)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'deals'
  ) THEN
    ALTER TABLE public.deals
      ADD COLUMN IF NOT EXISTS role_category text,
      ADD COLUMN IF NOT EXISTS timeframe_category text NOT NULL DEFAULT 'TIMEFRAME_UNKNOWN',
      ADD COLUMN IF NOT EXISTS lead_temperature text NOT NULL DEFAULT 'LEAD_COLD',
      ADD COLUMN IF NOT EXISTS journey_stage text,
      ADD COLUMN IF NOT EXISTS relationship_category text,
      ADD COLUMN IF NOT EXISTS classification_meta jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;
