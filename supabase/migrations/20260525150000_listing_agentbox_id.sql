-- AgentBox listing ID for property sync (mirrors contacts.agentbox_id pattern)

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS agentbox_id INTEGER,
  ADD COLUMN IF NOT EXISTS agentbox_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_agentbox_id
  ON public.listings(agentbox_id)
  WHERE agentbox_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
