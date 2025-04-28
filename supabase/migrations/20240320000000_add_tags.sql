-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id)
);

-- Create task_tags junction table
CREATE TABLE IF NOT EXISTS task_tags (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (task_id, tag_id)
);

-- Add RLS policies for tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tags"
  ON tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
  ON tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON tags FOR DELETE
  USING (auth.uid() = user_id);

-- Add RLS policies for task_tags
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own task tags"
  ON task_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_tags.task_id
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own task tags"
  ON task_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_tags.task_id
      AND tasks.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM tags
      WHERE tags.id = task_tags.tag_id
      AND tags.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own task tags"
  ON task_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_tags.task_id
      AND tasks.user_id = auth.uid()
    )
  ); 