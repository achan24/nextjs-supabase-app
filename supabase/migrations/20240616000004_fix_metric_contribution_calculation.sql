-- Fix metric calculation to not multiply count by contribution value
CREATE OR REPLACE FUNCTION public.apply_sequence_contributions()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
  -- Recalculate metrics from scratch for affected metrics
  WITH sequence_metrics AS (
    SELECT 
      c.metric_id,
      COUNT(sc.id) as completion_count -- Just count completions, don't multiply
    FROM life_goal_sequence_contributions c
    JOIN sequence_completions sc ON sc.sequence_id = c.sequence_id
    WHERE c.sequence_id = NEW.sequence_id
    GROUP BY c.metric_id
  )
  UPDATE life_goal_metrics m
  SET current_value = COALESCE(sm.completion_count, 0)
  FROM sequence_metrics sm
  WHERE m.id = sm.metric_id;
  
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trg_seq_completion_apply ON public.sequence_completions;

CREATE TRIGGER trg_seq_completion_apply
AFTER INSERT ON public.sequence_completions
FOR EACH ROW
EXECUTE FUNCTION public.apply_sequence_contributions();

-- Recalculate all existing metrics
WITH sequence_metrics AS (
  SELECT 
    c.metric_id,
    COUNT(sc.id) as completion_count
  FROM life_goal_sequence_contributions c
  JOIN sequence_completions sc ON sc.sequence_id = c.sequence_id
  GROUP BY c.metric_id
)
UPDATE life_goal_metrics m
SET current_value = COALESCE(sm.completion_count, 0)
FROM sequence_metrics sm
WHERE m.id = sm.metric_id; 