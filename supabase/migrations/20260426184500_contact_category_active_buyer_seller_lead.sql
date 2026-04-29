-- Extend contact playbook categories for portal buyer/seller routing.
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
      'seller_lead'
    )
  );

NOTIFY pgrst, 'reload schema';
