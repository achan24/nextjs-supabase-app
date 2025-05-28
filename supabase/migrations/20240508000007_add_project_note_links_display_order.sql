-- Add display_order column to project_note_links table
ALTER TABLE project_note_links
ADD COLUMN display_order integer DEFAULT 0;

-- Create an index on display_order for better performance
CREATE INDEX project_note_links_display_order_idx ON project_note_links(display_order);

-- Update existing records to have sequential display_order based on created_at
WITH numbered_notes AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) - 1 as row_num
  FROM project_note_links
)
UPDATE project_note_links
SET display_order = numbered_notes.row_num
FROM numbered_notes
WHERE project_note_links.id = numbered_notes.id;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own project note links" ON project_note_links;

-- Create a single comprehensive policy for all operations
CREATE POLICY "Users can manage their own project note links"
  ON project_note_links
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id); 