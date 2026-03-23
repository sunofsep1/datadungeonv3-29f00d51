-- Remove global UNIQUE on contacts.email when the constraint name is contacts_email_key
-- (common when added from Supabase Dashboard). Allows shared emails across contacts.
-- If your project uses a different constraint name, drop it in the Dashboard or add another
-- ALTER TABLE ... DROP CONSTRAINT line here.

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_email_key;

DROP INDEX IF EXISTS contacts_email_key;
