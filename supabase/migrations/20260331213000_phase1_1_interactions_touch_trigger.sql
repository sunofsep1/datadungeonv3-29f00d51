-- Phase 1.1: Auto-sync touch/activity timestamps from interaction logging.
CREATE OR REPLACE FUNCTION public.sync_contact_touch_from_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.contacts
  SET
    last_touch_date = COALESCE(NEW.timestamp, NEW.created_at, NOW()),
    last_activity_at = COALESCE(NEW.timestamp, NEW.created_at, NOW())
  WHERE id = NEW.contact_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_contact_touch_from_interaction ON public.interactions;

CREATE TRIGGER trg_sync_contact_touch_from_interaction
AFTER INSERT ON public.interactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_contact_touch_from_interaction();

NOTIFY pgrst, 'reload schema';
