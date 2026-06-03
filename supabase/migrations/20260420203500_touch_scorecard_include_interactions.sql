-- Include interaction channels in touch scorecard RPCs.
-- This keeps existing touch targets while counting timeline interactions
-- (call/sms/email/meeting/note) alongside rows in public.touches.

CREATE OR REPLACE FUNCTION public.get_daily_touch_summary()
RETURNS TABLE(touch_type text, completed bigint, daily_target integer)
LANGUAGE sql
STABLE
AS $function$
  WITH touch_rows AS (
    SELECT
      lower(coalesce(t.touch_type, 'other'))::text AS normalized_type
    FROM public.touches t
    JOIN public.contacts c ON c.id = t.contact_id
    WHERE t.touch_date::date = CURRENT_DATE
      AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
  ),
  interaction_rows AS (
    SELECT
      CASE
        WHEN lower(coalesce(i.channel, '')) IN ('phone', 'call') OR lower(coalesce(i.type, '')) = 'call' THEN 'call'
        WHEN lower(coalesce(i.channel, '')) = 'sms' OR lower(coalesce(i.type, '')) = 'sms' THEN 'sms'
        WHEN lower(coalesce(i.channel, '')) = 'email' OR lower(coalesce(i.type, '')) = 'email' THEN 'email'
        WHEN lower(coalesce(i.channel, '')) IN ('in_person', 'meeting') OR lower(coalesce(i.type, '')) = 'meeting' THEN 'meeting'
        ELSE 'other'
      END::text AS normalized_type
    FROM public.interactions i
    JOIN public.contacts c ON c.id = i.contact_id
    WHERE i.timestamp::date = CURRENT_DATE
      AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
  ),
  all_rows AS (
    SELECT normalized_type FROM touch_rows
    UNION ALL
    SELECT normalized_type FROM interaction_rows
  )
  SELECT
    ar.normalized_type AS touch_type,
    COUNT(*)::BIGINT AS completed,
    CASE ar.normalized_type
      WHEN 'handwritten_card' THEN 2
      WHEN 'break_bread' THEN 1
      WHEN 'weekly_email' THEN 1
      WHEN 'call' THEN 8
      WHEN 'sms' THEN 8
      WHEN 'email' THEN 5
      WHEN 'meeting' THEN 2
      ELSE NULL
    END::INTEGER AS daily_target
  FROM all_rows ar
  GROUP BY ar.normalized_type
  ORDER BY ar.normalized_type;
$function$;

CREATE OR REPLACE FUNCTION public.get_weekly_touch_summary()
RETURNS TABLE(touch_type text, completed bigint, weekly_target integer)
LANGUAGE sql
STABLE
AS $function$
  WITH touch_rows AS (
    SELECT
      lower(coalesce(t.touch_type, 'other'))::text AS normalized_type
    FROM public.touches t
    JOIN public.contacts c ON c.id = t.contact_id
    WHERE t.touch_date >= date_trunc('week', CURRENT_TIMESTAMP)
      AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
  ),
  interaction_rows AS (
    SELECT
      CASE
        WHEN lower(coalesce(i.channel, '')) IN ('phone', 'call') OR lower(coalesce(i.type, '')) = 'call' THEN 'call'
        WHEN lower(coalesce(i.channel, '')) = 'sms' OR lower(coalesce(i.type, '')) = 'sms' THEN 'sms'
        WHEN lower(coalesce(i.channel, '')) = 'email' OR lower(coalesce(i.type, '')) = 'email' THEN 'email'
        WHEN lower(coalesce(i.channel, '')) IN ('in_person', 'meeting') OR lower(coalesce(i.type, '')) = 'meeting' THEN 'meeting'
        ELSE 'other'
      END::text AS normalized_type
    FROM public.interactions i
    JOIN public.contacts c ON c.id = i.contact_id
    WHERE i.timestamp >= date_trunc('week', CURRENT_TIMESTAMP)
      AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
  ),
  all_rows AS (
    SELECT normalized_type FROM touch_rows
    UNION ALL
    SELECT normalized_type FROM interaction_rows
  )
  SELECT
    ar.normalized_type AS touch_type,
    COUNT(*)::BIGINT AS completed,
    CASE ar.normalized_type
      WHEN 'break_bread' THEN 5
      WHEN 'housing_update_video' THEN 1
      WHEN 'weekly_email' THEN 1
      WHEN 'call' THEN 40
      WHEN 'sms' THEN 40
      WHEN 'email' THEN 25
      WHEN 'meeting' THEN 10
      ELSE NULL
    END::INTEGER AS weekly_target
  FROM all_rows ar
  GROUP BY ar.normalized_type
  ORDER BY ar.normalized_type;
$function$;
