-- =============================================================================
-- Backfill: first_name/last_name, contact_channels from legacy contacts columns
-- =============================================================================
-- Safe, additive only. Does NOT drop or null out email/phone on contacts.
-- Run after 20260127120000_contacts_properties_upgrade.sql
-- =============================================================================

-- 1. Backfill first_name, last_name from name (split on first space)
UPDATE public.contacts
SET
  first_name = CASE
    WHEN position(' ' IN trim(name)) > 0 THEN split_part(trim(name), ' ', 1)
    ELSE trim(name)
  END,
  last_name = CASE
    WHEN position(' ' IN trim(name)) > 0 THEN nullif(trim(substring(trim(name) from position(' ' IN trim(name)) + 1)), '')
    ELSE NULL
  END
WHERE first_name IS NULL AND last_name IS NULL AND name IS NOT NULL AND trim(name) <> '';

-- 2. Backfill contact_channels from email (one row per contact with email)
INSERT INTO public.contact_channels (contact_id, channel_type, value, is_primary, label)
SELECT c.id, 'email', c.email, true, 'primary'
FROM public.contacts c
WHERE c.email IS NOT NULL AND trim(c.email) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.contact_channels ch WHERE ch.contact_id = c.id AND ch.channel_type = 'email');

-- 3. Backfill contact_channels from phone (one row per contact with phone)
INSERT INTO public.contact_channels (contact_id, channel_type, value, is_primary, label)
SELECT c.id, 'phone', c.phone, true, 'primary'
FROM public.contacts c
WHERE c.phone IS NOT NULL AND trim(c.phone) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.contact_channels ch WHERE ch.contact_id = c.id AND ch.channel_type = 'phone');
