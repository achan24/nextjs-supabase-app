-- Add tags column to notes table
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add an index on the tags column for better query performance
CREATE INDEX IF NOT EXISTS notes_tags_idx ON notes USING GIN (tags); 