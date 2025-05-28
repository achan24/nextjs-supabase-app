-- Add display_order column to project_note_links table
ALTER TABLE project_note_links
ADD COLUMN display_order integer DEFAULT 0;

-- Create an index on display_order for better performance
CREATE INDEX project_note_links_display_order_idx ON project_note_links(project_id, display_order);

-- Update existing records to have sequential display_order
WITH numbered_links AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) - 1 as row_num
  FROM project_note_links
)
UPDATE project_note_links
SET display_order = numbered_links.row_num
FROM numbered_links
WHERE project_note_links.id = numbered_links.id; 