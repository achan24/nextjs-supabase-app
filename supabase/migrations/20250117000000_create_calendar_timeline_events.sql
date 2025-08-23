-- Create calendar_timeline_events table for the Interactive Calendar Timeline
-- This is separate from the existing timeline_events table which is for the Timeline Explorer

CREATE TABLE IF NOT EXISTS calendar_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  duration integer NOT NULL DEFAULT 15, -- duration in minutes
  event_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS calendar_timeline_events_user_id_idx ON calendar_timeline_events(user_id);
CREATE INDEX IF NOT EXISTS calendar_timeline_events_event_date_idx ON calendar_timeline_events(event_date);
CREATE INDEX IF NOT EXISTS calendar_timeline_events_user_date_idx ON calendar_timeline_events(user_id, event_date);

-- Enable RLS
ALTER TABLE calendar_timeline_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own calendar timeline events" ON calendar_timeline_events;
CREATE POLICY "Users can view their own calendar timeline events" ON calendar_timeline_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own calendar timeline events" ON calendar_timeline_events;
CREATE POLICY "Users can insert their own calendar timeline events" ON calendar_timeline_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own calendar timeline events" ON calendar_timeline_events;
CREATE POLICY "Users can update their own calendar timeline events" ON calendar_timeline_events
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own calendar timeline events" ON calendar_timeline_events;
CREATE POLICY "Users can delete their own calendar timeline events" ON calendar_timeline_events
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger (reuse existing function)
DROP TRIGGER IF EXISTS update_calendar_timeline_events_updated_at ON calendar_timeline_events;
CREATE TRIGGER update_calendar_timeline_events_updated_at
  BEFORE UPDATE ON calendar_timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
