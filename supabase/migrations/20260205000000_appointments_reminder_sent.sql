-- Add reminder_sent_at to appointments for appointment reminder emails
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.appointments.reminder_sent_at IS 'When reminder email was sent (avoids duplicates)';
