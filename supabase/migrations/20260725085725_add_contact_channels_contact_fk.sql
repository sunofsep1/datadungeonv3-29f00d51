-- Second missing FK found by the 25 Jul audit: contact_channels.contact_id had no
-- constraint, breaking PostgREST embeds (appointment-reminders, process-workflows SMS/email steps).
ALTER TABLE public.contact_channels
  ADD CONSTRAINT contact_channels_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
NOTIFY pgrst, 'reload schema';
