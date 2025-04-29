-- Add time tracking columns to tasks table
ALTER TABLE tasks
ADD COLUMN time_spent INTEGER DEFAULT 0,
ADD COLUMN last_started_at TIMESTAMP WITH TIME ZONE;

-- Add comment to explain the columns
COMMENT ON COLUMN tasks.time_spent IS 'Total time spent on the task in seconds';
COMMENT ON COLUMN tasks.last_started_at IS 'Timestamp when the task was last started (set to in_progress)'; 