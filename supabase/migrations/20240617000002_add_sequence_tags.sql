-- Create sequence_tags junction table
CREATE TABLE IF NOT EXISTS public.sequence_tags (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sequence_id uuid NOT NULL REFERENCES timer_sequences(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.sequence_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sequence tags
CREATE POLICY "Users can view their own sequence tags"
    ON sequence_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM timer_sequences
            WHERE timer_sequences.id = sequence_tags.sequence_id
            AND timer_sequences.user_id = auth.uid()
        )
    );

-- Policy: Users can create their own sequence tags
CREATE POLICY "Users can create their own sequence tags"
    ON sequence_tags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM timer_sequences
            WHERE timer_sequences.id = sequence_tags.sequence_id
            AND timer_sequences.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM tags
            WHERE tags.id = sequence_tags.tag_id
            AND tags.user_id = auth.uid()
        )
    );

-- Policy: Users can delete their own sequence tags
CREATE POLICY "Users can delete their own sequence tags"
    ON sequence_tags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM timer_sequences
            WHERE timer_sequences.id = sequence_tags.sequence_id
            AND timer_sequences.user_id = auth.uid()
        )
    ); 