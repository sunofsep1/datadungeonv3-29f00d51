-- Phase 1 foundation: contact classification + touch cadence dates.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS contact_category TEXT,
  ADD COLUMN IF NOT EXISTS last_touch_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_touch_date TIMESTAMPTZ;

-- Backfill null categories so classification is always present.
UPDATE public.contacts
SET contact_category = 'warm_lead'
WHERE contact_category IS NULL;

-- Keep category constrained to the six agreed buckets.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contacts_contact_category_check'
  ) THEN
    ALTER TABLE public.contacts
      ADD CONSTRAINT contacts_contact_category_check
      CHECK (
        contact_category IN (
          'top_100',
          'past_client',
          'referral_partner',
          'hot_lead',
          'warm_lead',
          'seller_nurture'
        )
      );
  END IF;
END $$;

ALTER TABLE public.contacts
  ALTER COLUMN contact_category SET DEFAULT 'warm_lead',
  ALTER COLUMN contact_category SET NOT NULL;

-- Computed stale-contact lens for daily focus.
CREATE OR REPLACE VIEW public.stale_contacts AS
SELECT
  c.id,
  c.user_id,
  c.name,
  c.contact_category,
  c.last_touch_date,
  c.next_touch_date,
  EXTRACT(EPOCH FROM (NOW() - c.last_touch_date)) / 86400.0 AS days_since_last_touch
FROM public.contacts c
WHERE c.last_touch_date IS NOT NULL
  AND c.last_touch_date < NOW() - INTERVAL '14 days'
ORDER BY c.last_touch_date ASC;

NOTIFY pgrst, 'reload schema';
