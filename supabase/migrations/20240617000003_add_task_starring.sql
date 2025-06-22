-- Add is_starred column to tasks table
ALTER TABLE tasks ADD COLUMN is_starred BOOLEAN DEFAULT FALSE;

-- Create index for faster sorting of starred tasks
CREATE INDEX idx_tasks_is_starred ON tasks(is_starred);

-- Update RLS policies to include is_starred
CREATE POLICY "Users can update their own task's starred status" ON tasks
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id); 