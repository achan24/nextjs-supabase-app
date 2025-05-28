-- Add display_order column to projects table
ALTER TABLE projects
ADD COLUMN display_order integer DEFAULT 0;

-- Create an index on display_order for better performance
CREATE INDEX projects_display_order_idx ON projects(display_order);

-- Update existing records to have sequential display_order based on created_at
WITH numbered_projects AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 as row_num
  FROM projects
)
UPDATE projects
SET display_order = numbered_projects.row_num
FROM numbered_projects
WHERE projects.id = numbered_projects.id; 