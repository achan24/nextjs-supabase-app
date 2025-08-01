-- Create note_folders table for hierarchical organization
CREATE TABLE IF NOT EXISTS note_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES note_folders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for note_folders
CREATE INDEX IF NOT EXISTS note_folders_user_id_idx ON note_folders(user_id);
CREATE INDEX IF NOT EXISTS note_folders_parent_id_idx ON note_folders(parent_id);

-- Enable RLS for note_folders
ALTER TABLE note_folders ENABLE ROW LEVEL SECURITY;

-- Create policies for note_folders
CREATE POLICY "Users can create their own note folders" ON note_folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own note folders" ON note_folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own note folders" ON note_folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own note folders" ON note_folders
    FOR DELETE USING (auth.uid() = user_id);

-- Enhance existing notes table with new columns
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES note_folders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- Add indexes for enhanced notes
CREATE INDEX IF NOT EXISTS notes_folder_id_idx ON notes(folder_id);
CREATE INDEX IF NOT EXISTS notes_is_favorite_idx ON notes(is_favorite);
CREATE INDEX IF NOT EXISTS notes_last_accessed_at_idx ON notes(last_accessed_at);

-- Create note_links table for bidirectional linking
CREATE TABLE IF NOT EXISTS note_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
    target_note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
    link_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(source_note_id, target_note_id)
);

-- Add indexes for note_links
CREATE INDEX IF NOT EXISTS note_links_source_note_id_idx ON note_links(source_note_id);
CREATE INDEX IF NOT EXISTS note_links_target_note_id_idx ON note_links(target_note_id);

-- Enable RLS for note_links
ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;

-- Create policies for note_links
CREATE POLICY "Users can create links between their own notes" ON note_links
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM notes WHERE id = source_note_id AND user_id = auth.uid()) 
        AND EXISTS (SELECT 1 FROM notes WHERE id = target_note_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can view links between their own notes" ON note_links
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM notes WHERE id = source_note_id AND user_id = auth.uid()) 
        AND EXISTS (SELECT 1 FROM notes WHERE id = target_note_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can update links between their own notes" ON note_links
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM notes WHERE id = source_note_id AND user_id = auth.uid()) 
        AND EXISTS (SELECT 1 FROM notes WHERE id = target_note_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can delete links between their own notes" ON note_links
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM notes WHERE id = source_note_id AND user_id = auth.uid()) 
        AND EXISTS (SELECT 1 FROM notes WHERE id = target_note_id AND user_id = auth.uid())
    );

-- Create updated_at trigger for note_folders
CREATE OR REPLACE FUNCTION handle_note_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_note_folders_updated_at
    BEFORE UPDATE ON note_folders
    FOR EACH ROW
    EXECUTE FUNCTION handle_note_folders_updated_at();

-- Create function to update last_accessed_at when notes are accessed
CREATE OR REPLACE FUNCTION update_note_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_note_last_accessed
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_note_last_accessed(); 