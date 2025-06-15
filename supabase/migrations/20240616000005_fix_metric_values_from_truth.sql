-- Reset metric values to match the actual counts from sequence_completions
WITH sequence_counts AS (
  SELECT 
    c.metric_id,
    COUNT(DISTINCT sc.id) as actual_count
  FROM life_goal_sequence_contributions c
  JOIN sequence_completions sc ON sc.sequence_id = c.sequence_id
  GROUP BY c.metric_id
)
UPDATE life_goal_metrics m
SET current_value = COALESCE(sc.actual_count, 0)
FROM sequence_counts sc
WHERE m.id = sc.metric_id; 