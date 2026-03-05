-- Add notes and status to vision board items for the full vision card page
ALTER TABLE public.vision_board_items
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_started';

COMMENT ON COLUMN public.vision_board_items.notes IS 'Free-form notes for the vision card (full page)';
COMMENT ON COLUMN public.vision_board_items.status IS 'Progress: not_started | in_progress | achieved';