-- First remove the old constraint
ALTER TABLE public.sequence_completions
DROP CONSTRAINT IF EXISTS unique_sequence_completion;

-- Create a function to check for recent completions
CREATE OR REPLACE FUNCTION check_recent_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's a completion within the last 5 minutes
  IF EXISTS (
    SELECT 1 
    FROM sequence_completions
    WHERE sequence_id = NEW.sequence_id 
    AND user_id = NEW.user_id
    AND completed_at > (NEW.completed_at - INTERVAL '5 minutes')
    AND completed_at < NEW.completed_at
  ) THEN
    RAISE EXCEPTION 'A completion for this sequence already exists within the last 5 minutes'
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS check_recent_completion_trigger ON sequence_completions;
CREATE TRIGGER check_recent_completion_trigger
  BEFORE INSERT ON sequence_completions
  FOR EACH ROW
  EXECUTE FUNCTION check_recent_completion(); 