-- Fix the trigger to always use sequence_completions as source of truth
CREATE OR REPLACE FUNCTION public.apply_sequence_contributions()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
  -- Update all affected metrics by recalculating from sequence_completions
  WITH sequence_counts AS (
    SELECT 
      c.metric_id,
      COUNT(DISTINCT sc.id) as actual_count
    FROM life_goal_sequence_contributions c
    JOIN sequence_completions sc ON sc.sequence_id = c.sequence_id
    WHERE c.sequence_id = NEW.sequence_id
    GROUP BY c.metric_id
  )
  UPDATE life_goal_metrics m
  SET current_value = COALESCE(sc.actual_count, 0)
  FROM sequence_counts sc
  WHERE m.id = sc.metric_id;
  
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trg_seq_completion_apply ON public.sequence_completions;

CREATE TRIGGER trg_seq_completion_apply
AFTER INSERT ON public.sequence_completions
FOR EACH ROW
EXECUTE FUNCTION public.apply_sequence_contributions(); 