-- Align weekly summary with doc: primary weekly quota is break-bread (5/week).
-- Thank-you cards are tracked weekly as a count without a fixed weekly ceiling in SQL.
CREATE OR REPLACE FUNCTION public.get_weekly_touch_summary()
RETURNS TABLE (
  touch_type TEXT,
  completed BIGINT,
  weekly_target INTEGER
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    t.touch_type,
    COUNT(*)::BIGINT AS completed,
    CASE t.touch_type
      WHEN 'break_bread' THEN 5
      WHEN 'housing_update_video' THEN 1
      WHEN 'weekly_email' THEN 1
      ELSE NULL
    END::INTEGER AS weekly_target
  FROM public.touches t
  JOIN public.contacts c ON c.id = t.contact_id
  WHERE t.touch_date >= date_trunc('week', CURRENT_TIMESTAMP)
    AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
  GROUP BY t.touch_type
  ORDER BY t.touch_type;
$$;

NOTIFY pgrst, 'reload schema';
