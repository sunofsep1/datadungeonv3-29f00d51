-- Calendar rebuild, phase 0 — give `appointments` a real shape.
--
-- Until now an appointment was a single point in time: one `date` column, no end,
-- no duration, no link to a property or listing. That made a timeline view
-- impossible and left `calendar_events` (which did have start/end) as a second,
-- parallel table the UI never read.
--
-- We extend `appointments` rather than migrating to `calendar_events` because
-- `appointments` is what the whole app, the Google Calendar sync
-- (google_event_id) and the appointment-reminders cron are already wired to.

alter table public.appointments
  add column if not exists end_date   timestamptz,
  add column if not exists all_day    boolean not null default false,
  add column if not exists property_id uuid,
  add column if not exists listing_id  uuid;

comment on column public.appointments.end_date is
  'End of the appointment. Null means treat as the default duration from date.';
comment on column public.appointments.all_day is
  'True for whole-day entries; consumers should ignore the time component.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_property_id_fkey'
  ) then
    alter table public.appointments
      add constraint appointments_property_id_fkey
      foreign key (property_id) references public.properties(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_listing_id_fkey'
  ) then
    alter table public.appointments
      add constraint appointments_listing_id_fkey
      foreign key (listing_id) references public.listings(id) on delete set null;
  end if;
end $$;

-- end_date must actually be after the start.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_end_after_start'
  ) then
    alter table public.appointments
      add constraint appointments_end_after_start
      check (end_date is null or end_date > date);
  end if;
end $$;

create index if not exists appointments_date_idx        on public.appointments (date);
create index if not exists appointments_contact_id_idx  on public.appointments (contact_id);
create index if not exists appointments_listing_id_idx  on public.appointments (listing_id);
