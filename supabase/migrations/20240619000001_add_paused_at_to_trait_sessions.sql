-- Add paused_at column to trait_sessions table for background timer support
ALTER TABLE public.trait_sessions 
ADD COLUMN IF NOT EXISTS paused_at timestamptz;

-- Add index for efficient querying of active sessions
CREATE INDEX IF NOT EXISTS trait_sessions_active_idx 
ON public.trait_sessions (user_id, task_id) 
WHERE t_end IS NULL;
