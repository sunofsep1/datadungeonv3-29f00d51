-- P4: AML/KYC readiness on contacts (Reapit-style vendor/buyer compliance).

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS aml_id_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aml_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS aml_pep_clear boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aml_notes text;

COMMENT ON COLUMN public.contacts.aml_id_verified IS 'Identity verification completed for AML/CTF';
COMMENT ON COLUMN public.contacts.aml_verified_at IS 'When ID was verified';
COMMENT ON COLUMN public.contacts.aml_pep_clear IS 'PEP/sanctions screening cleared';

NOTIFY pgrst, 'reload schema';
