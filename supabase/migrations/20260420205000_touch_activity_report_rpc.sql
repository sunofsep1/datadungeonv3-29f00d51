-- Detailed touch activity report that aligns with summary logic and ownership scope.
CREATE OR REPLACE FUNCTION public.get_touch_activity_report(p_range text DEFAULT 'today')
RETURNS TABLE(
  source text,
  event_id uuid,
  touch_type text,
  contact_id uuid,
  contact_name text,
  occurred_at timestamptz,
  notes text
)
LANGUAGE sql
STABLE
AS $function$
  WITH bounds AS (
    SELECT
      CASE
        WHEN lower(coalesce(p_range, 'today')) = 'week' THEN date_trunc('week', CURRENT_TIMESTAMP)
        ELSE date_trunc('day', CURRENT_TIMESTAMP)
      END AS start_at,
      CURRENT_TIMESTAMP AS end_at
  ),
  touch_rows AS (
    SELECT
      'touches'::text AS source,
      t.id AS event_id,
      lower(coalesce(t.touch_type, 'other'))::text AS touch_type,
      t.contact_id,
      trim(
        coalesce(c.name, '') ||
        CASE WHEN c.name IS NOT NULL AND c.name <> '' THEN '' ELSE
          CASE
            WHEN coalesce(c.first_name, '') <> '' OR coalesce(c.last_name, '') <> ''
              THEN concat_ws(' ', c.first_name, c.last_name)
            ELSE ''
          END
        END
      ) AS contact_name,
      coalesce(t.touch_date, t.created_at) AS occurred_at,
      t.notes
    FROM public.touches t
    JOIN public.contacts c ON c.id = t.contact_id
    CROSS JOIN bounds b
    WHERE coalesce(t.touch_date, t.created_at) >= b.start_at
      AND coalesce(t.touch_date, t.created_at) <= b.end_at
      AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
  ),
  interaction_rows AS (
    SELECT
      'interactions'::text AS source,
      i.id AS event_id,
      CASE
        WHEN lower(coalesce(i.channel, '')) IN ('phone', 'call') OR lower(coalesce(i.type, '')) = 'call' THEN 'call'
        WHEN lower(coalesce(i.channel, '')) = 'sms' OR lower(coalesce(i.type, '')) = 'sms' THEN 'sms'
        WHEN lower(coalesce(i.channel, '')) = 'email' OR lower(coalesce(i.type, '')) = 'email' THEN 'email'
        WHEN lower(coalesce(i.channel, '')) IN ('in_person', 'meeting') OR lower(coalesce(i.type, '')) = 'meeting' THEN 'meeting'
        WHEN lower(coalesce(i.type, '')) = 'note' THEN 'note'
        ELSE lower(coalesce(i.type, i.channel, 'other'))
      END::text AS touch_type,
      i.contact_id,
      trim(
        coalesce(c.name, '') ||
        CASE WHEN c.name IS NOT NULL AND c.name <> '' THEN '' ELSE
          CASE
            WHEN coalesce(c.first_name, '') <> '' OR coalesce(c.last_name, '') <> ''
              THEN concat_ws(' ', c.first_name, c.last_name)
            ELSE ''
          END
        END
      ) AS contact_name,
      coalesce(i.timestamp, i.created_at) AS occurred_at,
      nullif(trim(concat_ws(' - ', i.subject, i.body)), '') AS notes
    FROM public.interactions i
    JOIN public.contacts c ON c.id = i.contact_id
    CROSS JOIN bounds b
    WHERE coalesce(i.timestamp, i.created_at) >= b.start_at
      AND coalesce(i.timestamp, i.created_at) <= b.end_at
      AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
  )
  SELECT
    rows.source,
    rows.event_id,
    rows.touch_type,
    rows.contact_id,
    coalesce(nullif(rows.contact_name, ''), 'Unknown contact') AS contact_name,
    rows.occurred_at,
    rows.notes
  FROM (
    SELECT * FROM touch_rows
    UNION ALL
    SELECT * FROM interaction_rows
  ) rows
  ORDER BY rows.occurred_at DESC;
$function$;
