-- Note Inbox v3: the Dismiss button sets status='dismissed', which the original
-- check constraint didn't allow (it silently 500'd). Widen the allowed set.
-- Applied to production via MCP on 2026-07-23; file kept for history parity.
alter table public.injector_notes drop constraint if exists injector_notes_status_check;
alter table public.injector_notes add constraint injector_notes_status_check
  check (status = any (array['received','extracting','extracted','reviewed','applied','error','dismissed']));
