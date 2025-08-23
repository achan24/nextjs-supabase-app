-- Create action_timelines table
CREATE TABLE IF NOT EXISTS action_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_executed_at TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER DEFAULT 0,
  total_execution_time BIGINT DEFAULT 0,
  favorite BOOLEAN DEFAULT FALSE
);

-- Create action_timeline_executions table
CREATE TABLE IF NOT EXISTS action_timeline_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID REFERENCES action_timelines(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration BIGINT, -- in milliseconds
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'paused', 'stopped')),
  execution_path JSONB NOT NULL,
  notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_action_timelines_user_id ON action_timelines(user_id);
CREATE INDEX IF NOT EXISTS idx_action_timelines_public ON action_timelines(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_action_timelines_tags ON action_timelines USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_action_timelines_favorite ON action_timelines(user_id, favorite) WHERE favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_action_timelines_updated_at ON action_timelines(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_timeline_executions_timeline_id ON action_timeline_executions(timeline_id);
CREATE INDEX IF NOT EXISTS idx_action_timeline_executions_user_id ON action_timeline_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_action_timeline_executions_started_at ON action_timeline_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_timeline_executions_status ON action_timeline_executions(status);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for action_timelines
DROP TRIGGER IF EXISTS update_action_timelines_updated_at ON action_timelines;
CREATE TRIGGER update_action_timelines_updated_at
  BEFORE UPDATE ON action_timelines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE action_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_timeline_executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for action_timelines
CREATE POLICY "Users can view their own action timelines" ON action_timelines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public action timelines" ON action_timelines
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can insert their own action timelines" ON action_timelines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own action timelines" ON action_timelines
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own action timelines" ON action_timelines
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for action_timeline_executions
CREATE POLICY "Users can view their own timeline executions" ON action_timeline_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timeline executions" ON action_timeline_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timeline executions" ON action_timeline_executions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timeline executions" ON action_timeline_executions
  FOR DELETE USING (auth.uid() = user_id);
