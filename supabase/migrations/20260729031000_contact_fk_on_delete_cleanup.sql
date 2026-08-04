-- 29 Jul 2026 — applied live via Supabase MCP (work session). File kept for repo history.
-- Why: deleting a contact who was still a property owner threw a raw FK error in the UI
-- ("properties_owner_contact_id_fkey"). Completes the 25 Jul fkey cleanup.
-- Pattern: parent record survives the contact -> SET NULL (properties, deals);
--          per-contact child rows -> CASCADE (activities, tasks).

do $$
declare r record;
begin
  for r in
    select conrelid::regclass::text as tbl, conname
    from pg_constraint
    where confrelid = 'public.contacts'::regclass
      and contype = 'f'
      and conrelid in ('public.properties'::regclass, 'public.deals'::regclass, 'public.activities'::regclass, 'public.tasks'::regclass)
      and pg_get_constraintdef(oid) not ilike '%on delete%'
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

alter table public.properties add constraint properties_owner_contact_id_fkey
  foreign key (owner_contact_id) references public.contacts(id) on delete set null;

alter table public.deals add constraint deals_primary_contact_id_fkey
  foreign key (primary_contact_id) references public.contacts(id) on delete set null;

alter table public.activities add constraint activities_contact_id_fkey
  foreign key (contact_id) references public.contacts(id) on delete cascade;

alter table public.tasks add constraint tasks_contact_id_fkey
  foreign key (contact_id) references public.contacts(id) on delete cascade;
