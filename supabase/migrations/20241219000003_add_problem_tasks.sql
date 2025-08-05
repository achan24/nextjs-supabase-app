-- Add problem_id to tasks table to link tasks to problems
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS problem_id UUID REFERENCES problems(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_problem_id ON tasks(problem_id);

-- Create index for user and problem queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_problem ON tasks(user_id, problem_id); 