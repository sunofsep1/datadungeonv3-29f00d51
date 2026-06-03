-- Ensure urgency/category column exists for contacts and refresh PostgREST schema cache.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN public.contacts.category IS 'CRM urgency tier: immediate, priority, planned, backlog';

-- Refresh Supabase REST schema cache so the new/confirmed column is visible immediately.
NOTIFY pgrst, 'reload schema';
