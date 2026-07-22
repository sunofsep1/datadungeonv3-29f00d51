-- Note Injector foundations: Conversation Hub + Prospecting Notes.
-- Applied to remote DB 2026-07-22 via MCP; this file version-controls it (idempotent).
create extension if not exists pgcrypto;

create table if not exists public.contact_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  channel text not null default 'call',
  summary text,
  highlights jsonb not null default '[]'::jsonb,
  next_steps text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contact_conversations_contact_id_idx on public.contact_conversations(contact_id);
create index if not exists contact_conversations_user_id_idx on public.contact_conversations(user_id);
alter table public.contact_conversations enable row level security;
drop policy if exists "cc_owner_all" on public.contact_conversations;
create policy "cc_owner_all" on public.contact_conversations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.contact_conversations to authenticated;

create table if not exists public.prospecting_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text,
  body text not null default '',
  tags text[] not null default '{}',
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prospecting_notes_user_created_idx on public.prospecting_notes(user_id, created_at desc);
alter table public.prospecting_notes enable row level security;
drop policy if exists "pn_owner_all" on public.prospecting_notes;
create policy "pn_owner_all" on public.prospecting_notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.prospecting_notes to authenticated;
