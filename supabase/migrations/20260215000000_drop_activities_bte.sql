-- Drop bte column from activities if it exists (e.g. added manually or by another system).
-- The app only uses: user_id, date, calls_made, appointments_set, listings_taken,
-- offers_written, contracts_signed, closings, gci_earned. No bte.
ALTER TABLE public.activities DROP COLUMN IF EXISTS bte;
