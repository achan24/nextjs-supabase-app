-- Add display_order column to project_node_links table
ALTER TABLE project_node_links
ADD COLUMN display_order integer DEFAULT 0;

-- Create an index on display_order for better performance
CREATE INDEX project_node_links_display_order_idx ON project_node_links(display_order);

-- Update existing records to have sequential display_order based on created_at
WITH numbered_nodes AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) - 1 as row_num
  FROM project_node_links
)
UPDATE project_node_links
SET display_order = numbered_nodes.row_num
FROM numbered_nodes
WHERE project_node_links.id = numbered_nodes.id;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own project node links" ON project_node_links;
DROP POLICY IF EXISTS "Users can create their own project node links" ON project_node_links;
DROP POLICY IF EXISTS "Users can update their own project node links" ON project_node_links;
DROP POLICY IF EXISTS "Users can delete their own project node links" ON project_node_links;

-- Create a single comprehensive policy for all operations
CREATE POLICY "Users can manage their own project node links"
  ON project_node_links
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id); 