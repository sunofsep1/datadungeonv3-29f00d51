-- Fix: "Could not delete appraisal — record \"new\" has no field \"updated_at\""
--
-- activity_log is an append-only audit table. It has created_at and occurred_at
-- but deliberately no updated_at column. Migration 20260205033629 attached the
-- generic update_updated_at_column() trigger to it anyway, so ANY update raised:
--
--     record "new" has no field "updated_at"
--
-- This surfaced in the UI as a failed appraisal delete: activity_log.listing_id
-- is declared ON DELETE SET NULL, so deleting a listing/appraisal issues an
-- UPDATE against activity_log, which fired the broken trigger and rolled the
-- whole delete back. It only bit when the appraisal had activity history
-- attached, which is why some deletes appeared to work.
--
-- Applied to production 26 Jul 2026. This migration records it in version
-- control so a rebuild from migrations does not reintroduce the trigger.

drop trigger if exists update_activity_log_updated_at on public.activity_log;
