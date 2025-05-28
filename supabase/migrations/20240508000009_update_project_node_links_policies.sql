-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own project node links" ON project_node_links;
DROP POLICY IF EXISTS "Users can create their own project node links" ON project_node_links;
DROP POLICY IF EXISTS "Users can update their own project node links" ON project_node_links;
DROP POLICY IF EXISTS "Users can delete their own project node links" ON project_node_links;
DROP POLICY IF EXISTS "Users can manage their own project node links" ON project_node_links;

-- Create a single comprehensive policy for all operations
CREATE POLICY "Users can manage their own project node links"
  ON project_node_links
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id); 