-- Store storage path for vision board images so we can create fresh signed URLs when loading
-- (signed URLs expire; bucket is private so we need to re-sign on each load)
ALTER TABLE public.vision_board_items
  ADD COLUMN IF NOT EXISTS image_path TEXT;

COMMENT ON COLUMN public.vision_board_items.image_path IS 'Storage path in vision-board bucket (e.g. user_id/uuid.jpg) for creating signed URLs';
