-- Enable RLS on 9 previously unprotected tables (security fix)
-- These tables were readable/writable by anyone with anon key

-- 1. pipelines
alter table public.pipelines enable row level security;
create policy "pipelines: users can access their own pipelines"
  on public.pipelines
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 2. pipeline_stages
alter table public.pipeline_stages enable row level security;
create policy "pipeline_stages: users can access pipelines they own"
  on public.pipeline_stages
  for all
  using (
    exists (
      select 1 from public.pipelines p
      where p.id = pipeline_stages.pipeline_id
      and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.pipelines p
      where p.id = pipeline_stages.pipeline_id
      and p.user_id = auth.uid()
    )
  );

-- 3. workflows
alter table public.workflows enable row level security;
create policy "workflows: users can access their own workflows"
  on public.workflows
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4. sequences (nurture)
alter table public.nurture_sequences enable row level security;
create policy "sequences: users can access their own sequences"
  on public.nurture_sequences
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 5. sequence_enrollments
alter table public.nurture_sequence_enrollments enable row level security;
create policy "sequence_enrollments: users can access enrollments in their sequences"
  on public.nurture_sequence_enrollments
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 6. lists (saved_views)
alter table public.saved_views enable row level security;
create policy "lists: users can access their own lists"
  on public.saved_views
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 7. deal_contacts
alter table public.deal_contacts enable row level security;
create policy "deal_contacts: users can access deals they own"
  on public.deal_contacts
  for all
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_contacts.deal_id
      and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.deals d
      where d.id = deal_contacts.deal_id
      and d.user_id = auth.uid()
    )
  );

-- 8. contact_companies
alter table public.contact_companies enable row level security;
create policy "contact_companies: users can access their own contact-company links"
  on public.contact_companies
  for all
  using (
    exists (
      select 1 from public.contacts c
      where c.id = contact_companies.contact_id
      and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.contacts c
      where c.id = contact_companies.contact_id
      and c.user_id = auth.uid()
    )
  );

-- Grant necessary permissions to service_role (for edge functions + admin ops)
grant all on public.pipelines to service_role;
grant all on public.pipeline_stages to service_role;
grant all on public.workflows to service_role;
grant all on public.nurture_sequences to service_role;
grant all on public.nurture_sequence_enrollments to service_role;
grant all on public.saved_views to service_role;
grant all on public.deal_contacts to service_role;
grant all on public.contact_companies to service_role;
