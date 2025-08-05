-- Function to get all problems for widget (list view)
CREATE OR REPLACE FUNCTION get_all_problems_widget(user_uuid UUID)
RETURNS TABLE (
  problem_id UUID,
  title TEXT,
  open_count INTEGER,
  total_count INTEGER,
  is_blocked BOOLEAN,
  progress_percentage NUMERIC,
  type TEXT,
  priority TEXT
) LANGUAGE sql STABLE AS $$
WITH RECURSIVE tree AS (
  SELECT
    p.id, p.parent_id, p.status, p.user_id,
    p.id AS root_id,
    ARRAY[p.id] AS path
  FROM problems p
  WHERE p.user_id = user_uuid AND p.parent_id IS NULL

  UNION ALL

  SELECT
    c.id, c.parent_id, c.status, c.user_id,
    t.root_id,
    t.path || c.id
  FROM problems c
  JOIN tree t ON c.parent_id = t.id
  WHERE c.user_id = user_uuid
    AND NOT c.id = ANY(t.path)
),
agg AS (
  SELECT
    root_id,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE status='open') AS open_count
  FROM tree
  GROUP BY root_id
)
SELECT
  r.id AS problem_id,
  r.title,
  a.open_count::int,
  a.total_count::int,
  (r.status = 'blocked') AS is_blocked,
  CASE
    WHEN a.total_count = 0 THEN 0
    ELSE ROUND(((a.total_count - a.open_count)::numeric / a.total_count) * 100, 1)
  END AS progress_percentage,
  r.type,
  r.priority
FROM agg a
JOIN problems r ON r.id = a.root_id
ORDER BY a.open_count DESC, r.updated_at DESC;
$$; 