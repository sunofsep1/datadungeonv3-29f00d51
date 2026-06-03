-- Contact social profile fields (Reapit / AgentBox parity)

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT;

NOTIFY pgrst, 'reload schema';
