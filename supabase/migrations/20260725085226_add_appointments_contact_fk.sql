-- appointment-reminders edge fn embeds contacts via PostgREST; that requires a real FK.
-- contact_id existed without a constraint, so the embed 400'd every hour.
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;
NOTIFY pgrst, 'reload schema';
