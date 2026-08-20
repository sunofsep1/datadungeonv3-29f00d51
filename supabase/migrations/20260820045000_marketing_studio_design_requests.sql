-- Marketing Studio: queue of Canva design requests raised from the app,
-- fulfilled by the Canva-connected assistant (Nate/Claude) via sweep.
-- (Already applied to production 2026-08-20 via assistant migration.)
create table if not exists public.design_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  listing_id uuid references public.listings(id) on delete set null,
  kind text not null check (kind in ('social_post','just_listed','open_home','price_update','sold','flyer','custom')),
  brief text not null,
  status text not null default 'pending' check (status in ('pending','generating','candidates_ready','selected','created','failed','cancelled')),
  candidates jsonb,
  selected_candidate_id text,
  design_id text,
  design_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.design_requests enable row level security;
do $$ begin
  create policy "design_requests_select_own" on public.design_requests for select using (auth.uid() = user_id);
  create policy "design_requests_insert_own" on public.design_requests for insert with check (auth.uid() = user_id);
  create policy "design_requests_update_own" on public.design_requests for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
create index if not exists design_requests_status_idx on public.design_requests (status, created_at);
create index if not exists design_requests_listing_idx on public.design_requests (listing_id);

-- allow 'design' kind in listing_resources
alter table public.listing_resources drop constraint if exists listing_resources_kind_check;
alter table public.listing_resources add constraint listing_resources_kind_check
  check (kind = any (array['photo'::text,'floorplan'::text,'document'::text,'link'::text,'design'::text]));
