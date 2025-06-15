-- First, reset all metric values to 0
UPDATE life_goal_metrics
SET current_value = 0;

-- Then recalculate metric values based on sequence completions and contributions
WITH sequence_metrics AS (
  SELECT 
    c.metric_id,
    COUNT(sc.id) * c.contribution_value as total_contribution
  FROM life_goal_sequence_contributions c
  JOIN sequence_completions sc ON sc.sequence_id = c.sequence_id
  GROUP BY c.metric_id, c.contribution_value
)
UPDATE life_goal_metrics m
SET current_value = sm.total_contribution
FROM sequence_metrics sm
WHERE m.id = sm.metric_id; 