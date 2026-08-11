-- Pocket AI integration: extend activity_log enum + idempotency index.

ALTER TYPE public.activity_log_type ADD VALUE IF NOT EXISTS 'meeting';
ALTER TYPE public.activity_log_type ADD VALUE IF NOT EXISTS 'voice_recording';

-- Idempotency: fast lookup by recording_id stored in metadata JSONB.
CREATE INDEX IF NOT EXISTS idx_activity_log_recording_id
  ON public.activity_log ((metadata->>'recording_id'))
  WHERE metadata->>'recording_id' IS NOT NULL;

NOTIFY pgrst, 'reload schema';
