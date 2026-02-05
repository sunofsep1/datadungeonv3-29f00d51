-- Add google_event_id to appointments for syncing with Google Calendar
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

COMMENT ON COLUMN public.appointments.google_event_id IS 'Google Calendar event ID when appointment is synced to GCal';
