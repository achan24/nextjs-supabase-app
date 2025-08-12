-- Migration to add timeline_id column to existing timeline_nodes table
-- Run this in your Supabase SQL editor

-- First, create the timelines table if it doesn't exist
CREATE TABLE IF NOT EXISTS timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  root_node_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add timeline_id column to timeline_nodes if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timeline_nodes' AND column_name = 'timeline_id') THEN
        ALTER TABLE timeline_nodes ADD COLUMN timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create a default timeline for existing nodes
DO $$
DECLARE
    default_timeline_id UUID;
    user_record RECORD;
BEGIN
    -- For each user who has timeline nodes, create a default timeline
    FOR user_record IN SELECT DISTINCT user_id FROM timeline_nodes WHERE timeline_id IS NULL
    LOOP
        -- Create a default timeline for this user
        INSERT INTO timelines (title, description, user_id) 
        VALUES ('Default Timeline', 'Timeline created during migration', user_record.user_id)
        RETURNING id INTO default_timeline_id;
        
        -- Update all nodes for this user to belong to this timeline
        UPDATE timeline_nodes 
        SET timeline_id = default_timeline_id 
        WHERE user_id = user_record.user_id AND timeline_id IS NULL;
        
        -- Set the root node for this timeline (first node created)
        UPDATE timelines 
        SET root_node_id = (
            SELECT id FROM timeline_nodes 
            WHERE timeline_id = default_timeline_id 
            ORDER BY created_at ASC 
            LIMIT 1
        )
        WHERE id = default_timeline_id;
    END LOOP;
END $$;

-- Make timeline_id NOT NULL after populating it
ALTER TABLE timeline_nodes ALTER COLUMN timeline_id SET NOT NULL;

-- Add index for timeline_id
CREATE INDEX IF NOT EXISTS idx_timeline_nodes_timeline_id ON timeline_nodes(timeline_id);

-- Add index for timelines user_id
CREATE INDEX IF NOT EXISTS idx_timelines_user_id ON timelines(user_id);

-- Enable RLS on timelines table
ALTER TABLE timelines ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for timelines table
DO $$ 
BEGIN
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
END $$;
