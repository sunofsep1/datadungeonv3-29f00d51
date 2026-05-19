-- P0/P4: entity audit trail, Reapit-style per-channel DNC, expanded listing contact roles.

CREATE TABLE IF NOT EXISTS public.entity_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'listing', 'property')),
  entity_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  summary TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entity_audit_log_entity ON public.entity_audit_log(entity_type, entity_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_audit_log_user ON public.entity_audit_log(user_id, changed_at DESC);

ALTER TABLE public.entity_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own entity_audit_log" ON public.entity_audit_log;
CREATE POLICY "Users manage own entity_audit_log"
  ON public.entity_audit_log
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS dnc_phone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dnc_sms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dnc_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dnc_mail boolean NOT NULL DEFAULT false;

UPDATE public.contacts
SET
  dnc_email = COALESCE(email_opt_out, false),
  dnc_sms = COALESCE(sms_opt_out, false),
  dnc_phone = CASE WHEN do_not_contact IS TRUE THEN true ELSE COALESCE(dnc_phone, false) END
WHERE dnc_email IS NOT DISTINCT FROM false
  AND dnc_sms IS NOT DISTINCT FROM false;

ALTER TABLE public.listing_contact_links DROP CONSTRAINT IF EXISTS listing_contact_links_role_check;

ALTER TABLE public.listing_contact_links
  ADD CONSTRAINT listing_contact_links_role_check
  CHECK (role IN (
    'vendor',
    'prospective_buyer',
    'owner_occupier',
    'tenant',
    'solicitor',
    'buyer_solicitor',
    'body_corp',
    'agent',
    'conjunctional_agent',
    'key_buyer',
    'campaign_manager'
  ));

NOTIFY pgrst, 'reload schema';
