-- Note Master learning (Phase C): a living rules brief injected into every extraction.
-- Single row per user, editable from the Note Inbox. Applied to production via MCP 2026-07-23.
create table if not exists public.note_master_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  rules_md text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.note_master_rules enable row level security;
drop policy if exists "note_master_rules_own" on public.note_master_rules;
create policy "note_master_rules_own" on public.note_master_rules
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- (production row seeded via MCP with Greg's starting rules)
