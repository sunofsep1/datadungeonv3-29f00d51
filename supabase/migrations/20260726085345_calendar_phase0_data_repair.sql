-- Calendar rebuild, phase 0 — repair the data the old save path damaged,
-- unify the two calendar tables, and give events a real type vocabulary.

------------------------------------------------------------------------------
-- 1. The 10-hour shift.
--
-- Appointments.tsx built its timestamp as `${date}T${time}:00` with no offset.
-- Postgres read that naive value as UTC, so 1pm Brisbane was stored as 13:00Z
-- and rendered back as 11pm. Only rows written through that path are affected;
-- everything created before it (Bank Valuation, Building & Pest, the March/May
-- appraisals) converts correctly and must be left alone. Targeted by id.
------------------------------------------------------------------------------
update public.appointments
set date = date - interval '10 hours'
where id in (
  'd8165705-21be-4729-afeb-ba8c1f7120b3',  -- Open Home - 17 Elysium Road: 8:00pm -> 10:00am
  'd48344db-9861-4bd8-91ce-11ff99d9f5e4'   -- Listing Appt - 20 Elysium Road: 11:00pm -> 1:00pm
)
and date_part('hour', date at time zone 'Australia/Brisbane') in (20, 23);

------------------------------------------------------------------------------
-- 2. A real event vocabulary.
--
-- 6 of 8 rows were the catch-all 'meeting', which left nothing to colour-code
-- or filter by. Canonical set: appraisal, listing_appt, open_home, inspection,
-- valuation, settlement, prospecting, team, personal, meeting (fallback).
------------------------------------------------------------------------------
update public.appointments set type = 'listing_appt'
  where id in ('5d73b255-7cbd-44b9-968c-5545ed41700f',
               'd48344db-9861-4bd8-91ce-11ff99d9f5e4');
update public.appointments set type = 'appraisal'
  where id = '6010a718-6da6-4de7-97c5-edfcc85602aa';
update public.appointments set type = 'inspection'
  where id = '03551995-c666-4aef-b876-3f412c8764bb';
update public.appointments set type = 'valuation'
  where id = '0bdb4f7a-6461-417f-9fe0-4d4848436528';

------------------------------------------------------------------------------
-- 3. Goals are not appointments.
--
-- "Top 20 Sellers" and "Get my FULL Realestate license" already exist as
-- vision_board_items; these rows are duplicates created by the vision board's
-- "add to calendar" button, which wrote a bare date and so landed at midnight.
-- We do not delete them — we mark them all-day and personal so the diary can
-- render them as quiet day banners instead of phantom midnight bookings.
------------------------------------------------------------------------------
update public.appointments
set all_day = true, type = 'personal'
where id in ('b7a8fcd8-b222-4f4b-ba32-37c773d1ab82',
             '5337e3f7-1f1d-428c-9b17-649fdffdc248');

------------------------------------------------------------------------------
-- 4. Bring the orphaned prospecting blocks into the table the UI reads.
--
-- The five Daily 5 blocks were written to calendar_events, which nothing in the
-- app queries, so they only ever appeared via Google. Copy them across with
-- their real start/end times and the call list preserved in notes.
------------------------------------------------------------------------------
insert into public.appointments
  (user_id, title, date, end_date, notes, type, status, location, contact_id, all_day)
select
  ce.user_id,
  ce.title,
  ce.start_time,
  ce.end_time,
  ce.description,
  'prospecting',
  'scheduled',
  ce.location,
  ce.contact_id,
  false
from public.calendar_events ce
where not exists (
  select 1 from public.appointments a
  where a.title = ce.title and a.date = ce.start_time
);

------------------------------------------------------------------------------
-- 5. Retire calendar_events.
--
-- Rows are left in place rather than dropped so nothing is lost, but the table
-- is now deprecated: appointments is the single source of truth.
------------------------------------------------------------------------------
comment on table public.calendar_events is
  'DEPRECATED 26 Jul 2026. Superseded by public.appointments, which the UI, the '
  'Google Calendar sync and appointment-reminders all read. Rows were copied '
  'across in migration 20260726120500. Do not write here.';
