-- Create Process Mapper tables
-- This migration creates the database schema for the Process Mapper feature

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create process_mapper_sessions table
CREATE TABLE IF NOT EXISTS process_mapper_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  context TEXT CHECK (context IN ('academic', 'professional', 'social', 'personal', 'creative')),
  location TEXT,
  environment TEXT,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')) NOT NULL,
  total_duration INTEGER,
  complexity TEXT DEFAULT 'linear' CHECK (complexity IN ('linear', 'branching', 'complex')) NOT NULL,
  outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'negative', 'unclear')),
  notes TEXT,
  temp_map_id UUID REFERENCES process_flows(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create process_mapper_steps table
CREATE TABLE IF NOT EXISTS process_mapper_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES process_mapper_sessions(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  order_index INTEGER NOT NULL,
  confidence INTEGER CHECK (confidence >= 1 AND confidence <= 10),
  energy INTEGER CHECK (energy >= 1 AND energy <= 10),
  response TEXT CHECK (response IN ('positive', 'neutral', 'negative', 'none')),
  notes TEXT,
  task_node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create process_mapper_replay_instances table
CREATE TABLE IF NOT EXISTS process_mapper_replay_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES process_mapper_sessions(id) ON DELETE CASCADE NOT NULL,
  instance_number INTEGER NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  notes JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create process_mapper_timeline_notes table
CREATE TABLE IF NOT EXISTS process_mapper_timeline_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID REFERENCES process_mapper_steps(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES process_mapper_sessions(id) ON DELETE CASCADE NOT NULL,
  replay_instance_id UUID REFERENCES process_mapper_replay_instances(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  note TEXT NOT NULL,
  instance_version INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS process_mapper_sessions_user_id_idx ON process_mapper_sessions(user_id);
CREATE INDEX IF NOT EXISTS process_mapper_sessions_status_idx ON process_mapper_sessions(status);
CREATE INDEX IF NOT EXISTS process_mapper_sessions_start_time_idx ON process_mapper_sessions(start_time);

CREATE INDEX IF NOT EXISTS process_mapper_steps_session_id_idx ON process_mapper_steps(session_id);
CREATE INDEX IF NOT EXISTS process_mapper_steps_order_index_idx ON process_mapper_steps(order_index);
CREATE INDEX IF NOT EXISTS process_mapper_steps_start_time_idx ON process_mapper_steps(start_time);

CREATE INDEX IF NOT EXISTS process_mapper_replay_instances_session_id_idx ON process_mapper_replay_instances(session_id);
CREATE INDEX IF NOT EXISTS process_mapper_replay_instances_instance_number_idx ON process_mapper_replay_instances(instance_number);

CREATE INDEX IF NOT EXISTS process_mapper_timeline_notes_step_id_idx ON process_mapper_timeline_notes(step_id);
CREATE INDEX IF NOT EXISTS process_mapper_timeline_notes_session_id_idx ON process_mapper_timeline_notes(session_id);
CREATE INDEX IF NOT EXISTS process_mapper_timeline_notes_timestamp_idx ON process_mapper_timeline_notes(timestamp);

-- Enable Row Level Security
ALTER TABLE process_mapper_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_mapper_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_mapper_replay_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_mapper_timeline_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for process_mapper_sessions
CREATE POLICY "Users can create their own process mapper sessions" ON process_mapper_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own process mapper sessions" ON process_mapper_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own process mapper sessions" ON process_mapper_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own process mapper sessions" ON process_mapper_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for process_mapper_steps
CREATE POLICY "Users can create steps for their own sessions" ON process_mapper_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM process_mapper_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view steps for their own sessions" ON process_mapper_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM process_mapper_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update steps for their own sessions" ON process_mapper_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM process_mapper_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete steps for their own sessions" ON process_mapper_steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM process_mapper_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- Create RLS policies for process_mapper_replay_instances
CREATE POLICY "Users can create replay instances for their own sessions" ON process_mapper_replay_instances
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM process_mapper_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view replay instances for their own sessions" ON process_mapper_replay_instances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM process_mapper_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update replay instances for their own sessions" ON process_mapper_replay_instances
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM process_mapper_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete replay instances for their own sessions" ON process_mapper_replay_instances
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM process_mapper_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- Create RLS policies for process_mapper_timeline_notes
CREATE POLICY "Users can create timeline notes for their own sessions" ON process_mapper_timeline_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM process_mapper_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view timeline notes for their own sessions" ON process_mapper_timeline_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM process_mapper_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update timeline notes for their own sessions" ON process_mapper_timeline_notes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM process_mapper_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete timeline notes for their own sessions" ON process_mapper_timeline_notes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM process_mapper_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_process_mapper_sessions_updated_at 
  BEFORE UPDATE ON process_mapper_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 