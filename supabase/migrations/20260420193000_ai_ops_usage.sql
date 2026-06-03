-- AI Ops action queue + Claude usage reporting

CREATE TABLE IF NOT EXISTS public.ai_action_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'executing', 'succeeded', 'failed', 'cancelled')),
  estimated_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  actual_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ai_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.ai_action_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'contact',
  target_id UUID,
  payload_preview JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_execute JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'executing', 'succeeded', 'failed', 'cancelled')),
  execution_result JSONB,
  error_message TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'anthropic',
  provider_request_id TEXT,
  model TEXT NOT NULL,
  usage_date DATE NOT NULL,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  cache_creation_tokens BIGINT NOT NULL DEFAULT 0,
  cache_read_tokens BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usage_date DATE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'anthropic',
  model TEXT NOT NULL,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  cache_creation_tokens BIGINT NOT NULL DEFAULT 0,
  cache_read_tokens BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date, provider, model)
);

CREATE INDEX IF NOT EXISTS idx_ai_action_runs_user_created
  ON public.ai_action_runs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_action_runs_status_created
  ON public.ai_action_runs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_action_items_run_sort
  ON public.ai_action_items (run_id, sort_order ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_ai_action_items_user_status
  ON public.ai_action_items (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_user_date
  ON public.ai_usage_daily (user_id, usage_date DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_date
  ON public.ai_usage_events (user_id, usage_date DESC, fetched_at DESC);

ALTER TABLE public.ai_action_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_action_runs_select ON public.ai_action_runs;
CREATE POLICY ai_action_runs_select ON public.ai_action_runs
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_action_runs_insert ON public.ai_action_runs;
CREATE POLICY ai_action_runs_insert ON public.ai_action_runs
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_action_runs_update ON public.ai_action_runs;
CREATE POLICY ai_action_runs_update ON public.ai_action_runs
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_action_runs_delete ON public.ai_action_runs;
CREATE POLICY ai_action_runs_delete ON public.ai_action_runs
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_action_items_select ON public.ai_action_items;
CREATE POLICY ai_action_items_select ON public.ai_action_items
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_action_items_insert ON public.ai_action_items;
CREATE POLICY ai_action_items_insert ON public.ai_action_items
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_action_items_update ON public.ai_action_items;
CREATE POLICY ai_action_items_update ON public.ai_action_items
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_action_items_delete ON public.ai_action_items;
CREATE POLICY ai_action_items_delete ON public.ai_action_items
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_usage_daily_select ON public.ai_usage_daily;
CREATE POLICY ai_usage_daily_select ON public.ai_usage_daily
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_usage_events_select ON public.ai_usage_events;
CREATE POLICY ai_usage_events_select ON public.ai_usage_events
FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.ai_action_runs IS 'High-level AI action runs planned from prompts.';
COMMENT ON TABLE public.ai_action_items IS 'Individual pending/executed CRM actions within an AI run.';
COMMENT ON TABLE public.ai_usage_events IS 'Raw Anthropic usage records pulled by sync job.';
COMMENT ON TABLE public.ai_usage_daily IS 'Daily aggregated usage and spend by user + model.';
