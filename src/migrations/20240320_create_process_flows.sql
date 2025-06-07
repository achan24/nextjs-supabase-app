-- Create process_flows table
CREATE TABLE IF NOT EXISTS process_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create process_nodes table
CREATE TABLE IF NOT EXISTS process_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID REFERENCES process_flows(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 300, -- Default duration in seconds (5 minutes)
  position JSONB, -- Store node position in the flow
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create process_node_history table
CREATE TABLE IF NOT EXISTS process_node_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID REFERENCES process_nodes(id) ON DELETE CASCADE,
  duration INTEGER NOT NULL, -- Actual duration in seconds
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create RLS policies
ALTER TABLE process_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_node_history ENABLE ROW LEVEL SECURITY;

-- Policy for process_flows
CREATE POLICY "Users can view their own process flows"
  ON process_flows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own process flows"
  ON process_flows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own process flows"
  ON process_flows FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own process flows"
  ON process_flows FOR DELETE
  USING (auth.uid() = user_id);

-- Policy for process_nodes
CREATE POLICY "Users can view their own process nodes"
  ON process_nodes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own process nodes"
  ON process_nodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own process nodes"
  ON process_nodes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own process nodes"
  ON process_nodes FOR DELETE
  USING (auth.uid() = user_id);

-- Policy for process_node_history
CREATE POLICY "Users can view their own process node history"
  ON process_node_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own process node history"
  ON process_node_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own process node history"
  ON process_node_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own process node history"
  ON process_node_history FOR DELETE
  USING (auth.uid() = user_id); 