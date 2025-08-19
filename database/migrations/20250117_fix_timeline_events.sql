-- Add missing category column to timeline_events table
ALTER TABLE timeline_events 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'personal';

-- Add missing priority column if it doesn't exist
ALTER TABLE timeline_events 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';

-- Add missing event_type column if it doesn't exist
ALTER TABLE timeline_events 
ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'general';

-- Add missing is_completed column if it doesn't exist
ALTER TABLE timeline_events 
ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false;

-- Add missing related_goal_id column if it doesn't exist
ALTER TABLE timeline_events 
ADD COLUMN IF NOT EXISTS related_goal_id uuid REFERENCES life_goals(id) ON DELETE SET NULL;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS timeline_events_user_id_idx ON timeline_events(user_id);
CREATE INDEX IF NOT EXISTS timeline_events_event_date_idx ON timeline_events(event_date);
CREATE INDEX IF NOT EXISTS timeline_events_user_date_idx ON timeline_events(user_id, event_date);
CREATE INDEX IF NOT EXISTS timeline_events_category_idx ON timeline_events(category);

-- Enable RLS if not already enabled
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop and recreate to ensure they exist)
DROP POLICY IF EXISTS "Users can view their own timeline events" ON timeline_events;
CREATE POLICY "Users can view their own timeline events" ON timeline_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own timeline events" ON timeline_events;
CREATE POLICY "Users can insert their own timeline events" ON timeline_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own timeline events" ON timeline_events;
CREATE POLICY "Users can update their own timeline events" ON timeline_events
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own timeline events" ON timeline_events;
CREATE POLICY "Users can delete their own timeline events" ON timeline_events
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_timeline_events_updated_at ON timeline_events;
CREATE TRIGGER update_timeline_events_updated_at
  BEFORE UPDATE ON timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
