-- First, clean up existing duplicates by keeping only the most recent completion for each sequence/user pair
WITH duplicates AS (
  SELECT DISTINCT ON (sequence_id, user_id)
    id,
    sequence_id,
    user_id,
    completed_at
  FROM public.sequence_completions
  ORDER BY sequence_id, user_id, completed_at DESC
)
DELETE FROM public.sequence_completions
WHERE id NOT IN (SELECT id FROM duplicates);

-- Now add the unique constraint
ALTER TABLE public.sequence_completions
ADD CONSTRAINT unique_sequence_completion
UNIQUE (sequence_id, user_id);

-- Create trigger function to update metrics on completion
CREATE OR REPLACE FUNCTION public.apply_sequence_contributions()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
  -- Update all metrics that this sequence contributes to
  UPDATE life_goal_metrics m
  SET    current_value = m.current_value + c.contribution_value
  FROM   life_goal_sequence_contributions c
  WHERE  c.metric_id   = m.id
  AND    c.sequence_id = NEW.sequence_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update metrics after sequence completion
DROP TRIGGER IF EXISTS trg_seq_completion_apply ON public.sequence_completions;

CREATE TRIGGER trg_seq_completion_apply
AFTER INSERT ON public.sequence_completions
FOR EACH ROW
EXECUTE FUNCTION public.apply_sequence_contributions();

-- Add index to speed up sequence completion lookups
CREATE INDEX IF NOT EXISTS idx_sequence_completions_lookup 
ON public.sequence_completions(sequence_id, user_id); 