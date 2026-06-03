-- Street-prospect owners from Pricefinder map import.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contacts_contact_category_check'
      AND conrelid = 'public.contacts'::regclass
  ) THEN
    ALTER TABLE public.contacts DROP CONSTRAINT contacts_contact_category_check;
  END IF;
END $$;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_contact_category_check
  CHECK (
    contact_category IN (
      'top_100',
      'past_client',
      'referral_partner',
      'hot_lead',
      'warm_lead',
      'seller_nurture',
      'active_buyer',
      'seller_lead',
      'prospect'
    )
  );

COMMENT ON COLUMN public.contacts.category IS 'CRM urgency tier: immediate, priority, planned, backlog, prospect (purple)';

NOTIFY pgrst, 'reload schema';
