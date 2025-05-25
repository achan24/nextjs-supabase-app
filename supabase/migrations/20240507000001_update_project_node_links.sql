-- First ensure linked_node_id is text type
ALTER TABLE project_node_links 
  DROP CONSTRAINT IF EXISTS project_node_links_linked_node_id_fkey,
  ALTER COLUMN linked_node_id TYPE text;

-- Add a check constraint to ensure linked_node_id matches the format we expect
ALTER TABLE project_node_links
  ADD CONSTRAINT project_node_links_linked_node_id_format 
  CHECK (linked_node_id ~ '^[a-zA-Z]+-[0-9]+$');

-- Add a trigger to validate that the node exists in the referenced flow
CREATE OR REPLACE FUNCTION validate_node_in_flow()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM process_flows, 
         jsonb_array_elements(nodes) AS node 
    WHERE process_flows.id = NEW.linked_flow_id 
    AND (node->>'id')::text = NEW.linked_node_id::text
  ) THEN
    RAISE EXCEPTION 'Node % does not exist in flow %', NEW.linked_node_id, NEW.linked_flow_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_node_exists ON project_node_links;
CREATE TRIGGER ensure_node_exists
  BEFORE INSERT OR UPDATE ON project_node_links
  FOR EACH ROW
  EXECUTE FUNCTION validate_node_in_flow();

-- Update indexes for better performance
DROP INDEX IF EXISTS project_node_links_node_id_idx;
CREATE INDEX project_node_links_node_id_idx ON project_node_links(linked_node_id);
CREATE INDEX project_node_links_flow_node_idx ON project_node_links(linked_flow_id, linked_node_id);

COMMENT ON COLUMN project_node_links.linked_node_id IS 'ID of the node in the flow''s nodes JSONB array. Format: type-timestamp'; 