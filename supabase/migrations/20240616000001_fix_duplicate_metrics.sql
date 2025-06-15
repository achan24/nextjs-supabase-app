-- Find metrics that were affected by duplicate completions and fix their values
WITH sequence_metrics AS (
  SELECT 
    c.metric_id,
    COUNT(sc.id) * c.contribution_value as correct_value
  FROM life_goal_sequence_contributions c
  JOIN sequence_completions sc ON sc.sequence_id = c.sequence_id
  GROUP BY c.metric_id, c.contribution_value
)
UPDATE life_goal_metrics m
SET current_value = sm.correct_value
FROM sequence_metrics sm
WHERE m.id = sm.metric_id
AND m.current_value != sm.correct_value;  -- Only update metrics where the value is incorrect 