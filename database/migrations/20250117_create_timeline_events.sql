-- Create timeline_events table
CREATE TABLE IF NOT EXISTS timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date timestamp with time zone NOT NULL,
  event_type text NOT NULL DEFAULT 'general',
  category text DEFAULT 'personal',
  priority text DEFAULT 'medium',
  is_completed boolean DEFAULT false,
  related_goal_id uuid REFERENCES life_goals(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS timeline_events_user_id_idx ON timeline_events(user_id);
CREATE INDEX IF NOT EXISTS timeline_events_event_date_idx ON timeline_events(event_date);
CREATE INDEX IF NOT EXISTS timeline_events_user_date_idx ON timeline_events(user_id, event_date);
CREATE INDEX IF NOT EXISTS timeline_events_category_idx ON timeline_events(category);

-- Enable RLS
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_timeline_events_updated_at ON timeline_events;
CREATE TRIGGER update_timeline_events_updated_at
  BEFORE UPDATE ON timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
