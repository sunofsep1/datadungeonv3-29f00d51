-- Optional listing_tasks row when a listing enters a pipeline stage (workflow slice)
ALTER TABLE public.listing_stage_automations
  ADD COLUMN IF NOT EXISTS task_title TEXT,
  ADD COLUMN IF NOT EXISTS task_due_days INTEGER;

ALTER TABLE public.listing_stage_automations
  DROP CONSTRAINT IF EXISTS listing_stage_automations_task_due_days_range;

ALTER TABLE public.listing_stage_automations
  ADD CONSTRAINT listing_stage_automations_task_due_days_range
  CHECK (task_due_days IS NULL OR (task_due_days >= 0 AND task_due_days <= 3650));

COMMENT ON COLUMN public.listing_stage_automations.task_title IS
  'If set, a listing_tasks row is created when the listing enters this stage. Tokens: {{listing_address}}, {{contact_name}}.';
COMMENT ON COLUMN public.listing_stage_automations.task_due_days IS
  'Optional due offset in calendar days from stage entry; NULL means no due date.';
