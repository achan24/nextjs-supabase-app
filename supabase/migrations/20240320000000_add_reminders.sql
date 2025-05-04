-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('before', 'at')),
  minutes_before INTEGER,
  time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminders"
  ON reminders FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own reminders"
  ON reminders FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own reminders"
  ON reminders FOR UPDATE
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own reminders"
  ON reminders FOR DELETE
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE user_id = auth.uid()
    )
  );

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 