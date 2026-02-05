-- Create oauth_states table for secure OAuth state token validation
-- This prevents CSRF attacks by storing state tokens server-side
CREATE TABLE public.oauth_states (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast token lookup
CREATE INDEX idx_oauth_states_token ON public.oauth_states(token);

-- Create index for cleanup of expired tokens
CREATE INDEX idx_oauth_states_expires_at ON public.oauth_states(expires_at);

-- Enable RLS
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Only allow the edge function (via service role) to manage these records
-- No direct user access needed - edge function uses service role key
CREATE POLICY "Service role only" ON public.oauth_states
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Add comment explaining the table purpose
COMMENT ON TABLE public.oauth_states IS 'Stores temporary OAuth state tokens to prevent CSRF attacks during OAuth flows';