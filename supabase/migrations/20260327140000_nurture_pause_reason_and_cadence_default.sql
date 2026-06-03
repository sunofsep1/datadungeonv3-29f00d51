-- Persist nurture pause reason on the enrollment row; default new enrollments to unpaused cadence.
ALTER TABLE public.nurture_sequence_enrollments
  ADD COLUMN IF NOT EXISTS pause_reason text;

ALTER TABLE public.nurture_sequence_enrollments
  ALTER COLUMN pause_followup_cadence SET DEFAULT false;
