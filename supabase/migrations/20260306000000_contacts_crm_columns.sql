-- Ensure DataDungeon CRM columns exist on contacts (fixes schema cache error on save)
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS story TEXT,
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT,
  ADD COLUMN IF NOT EXISTS selling_intentions TEXT,
  ADD COLUMN IF NOT EXISTS current_situation_notes TEXT,
  ADD COLUMN IF NOT EXISTS pain_points TEXT,
  ADD COLUMN IF NOT EXISTS pleasure_points TEXT;
