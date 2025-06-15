-- Fix the metric counting to use sequence_completions as source of truth
CREATE OR REPLACE FUNCTION public.apply_sequence_contributions()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
  -- First get all metrics this sequence contributes to
  WITH affected_metrics AS (
    SELECT DISTINCT metric_id
    FROM life_goal_sequence_contributions
    WHERE sequence_id = NEW.sequence_id
  ),
  -- Then count actual completions for each metric
  metric_counts AS (
    SELECT 
      c.metric_id,
      COUNT(DISTINCT sc.id) as completion_count
    FROM life_goal_sequence_contributions c
    JOIN sequence_completions sc ON sc.sequence_id = c.sequence_id
    JOIN affected_metrics am ON am.metric_id = c.metric_id
    GROUP BY c.metric_id
  )
  -- Update only the affected metrics with their true counts
  UPDATE life_goal_metrics m
  SET current_value = COALESCE(mc.completion_count, 0)
  FROM metric_counts mc
  WHERE m.id = mc.metric_id;
  
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trg_seq_completion_apply ON public.sequence_completions;
CREATE TRIGGER trg_seq_completion_apply
AFTER INSERT ON public.sequence_completions
FOR EACH ROW
EXECUTE FUNCTION public.apply_sequence_contributions();

-- Recalculate all metrics to fix any incorrect values
WITH metric_counts AS (
  SELECT 
    c.metric_id,
    COUNT(DISTINCT sc.id) as completion_count
  FROM life_goal_sequence_contributions c
  JOIN sequence_completions sc ON sc.sequence_id = c.sequence_id
  GROUP BY c.metric_id
)
UPDATE life_goal_metrics m
SET current_value = COALESCE(mc.completion_count, 0)
FROM metric_counts mc
WHERE m.id = mc.metric_id; 