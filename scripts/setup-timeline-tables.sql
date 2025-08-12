-- Timeline Tables Setup for Supabase
-- Run this in your Supabase SQL editor

-- Create timelines table
CREATE TABLE IF NOT EXISTS timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  root_node_id UUID, -- Will be set after root node is created
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create timeline_nodes table
CREATE TABLE IF NOT EXISTS timeline_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('action', 'decision')),
  parent_id UUID REFERENCES timeline_nodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_duration_ms INTEGER,
  chosen_child_id UUID REFERENCES timeline_nodes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create timeline_action_records table
CREATE TABLE IF NOT EXISTS timeline_action_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES timeline_nodes(id) ON DELETE CASCADE,
  duration_ms INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create timeline_decision_records table
CREATE TABLE IF NOT EXISTS timeline_decision_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES timeline_nodes(id) ON DELETE CASCADE,
  chosen_child_id UUID NOT NULL REFERENCES timeline_nodes(id) ON DELETE CASCADE,
  decided_at TIMESTAMP WITH TIME ZONE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timelines_user_id ON timelines(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_nodes_timeline_id ON timeline_nodes(timeline_id);
CREATE INDEX IF NOT EXISTS idx_timeline_nodes_user_id ON timeline_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_nodes_parent_id ON timeline_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_timeline_action_records_node_id ON timeline_action_records(node_id);
CREATE INDEX IF NOT EXISTS idx_timeline_action_records_user_id ON timeline_action_records(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_decision_records_node_id ON timeline_decision_records(node_id);
CREATE INDEX IF NOT EXISTS idx_timeline_decision_records_user_id ON timeline_decision_records(user_id);

-- Enable Row Level Security
ALTER TABLE timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_action_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_decision_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
    -- timelines policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timelines' AND policyname = 'Users can view their own timelines') THEN
        CREATE POLICY "Users can view their own timelines" ON timelines
          FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timelines' AND policyname = 'Users can insert their own timelines') THEN
        CREATE POLICY "Users can insert their own timelines" ON timelines
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timelines' AND policyname = 'Users can update their own timelines') THEN
        CREATE POLICY "Users can update their own timelines" ON timelines
          FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timelines' AND policyname = 'Users can delete their own timelines') THEN
        CREATE POLICY "Users can delete their own timelines" ON timelines
          FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- timeline_nodes policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timeline_nodes' AND policyname = 'Users can view their own timeline nodes') THEN
        CREATE POLICY "Users can view their own timeline nodes" ON timeline_nodes
          FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timeline_nodes' AND policyname = 'Users can insert their own timeline nodes') THEN
        CREATE POLICY "Users can insert their own timeline nodes" ON timeline_nodes
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timeline_nodes' AND policyname = 'Users can update their own timeline nodes') THEN
        CREATE POLICY "Users can update their own timeline nodes" ON timeline_nodes
          FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timeline_nodes' AND policyname = 'Users can delete their own timeline nodes') THEN
        CREATE POLICY "Users can delete their own timeline nodes" ON timeline_nodes
          FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- timeline_action_records policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timeline_action_records' AND policyname = 'Users can view their own action records') THEN
        CREATE POLICY "Users can view their own action records" ON timeline_action_records
          FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timeline_action_records' AND policyname = 'Users can insert their own action records') THEN
        CREATE POLICY "Users can insert their own action records" ON timeline_action_records
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    -- timeline_decision_records policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timeline_decision_records' AND policyname = 'Users can view their own decision records') THEN
        CREATE POLICY "Users can view their own decision records" ON timeline_decision_records
          FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timeline_decision_records' AND policyname = 'Users can insert their own decision records') THEN
        CREATE POLICY "Users can insert their own decision records" ON timeline_decision_records
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
