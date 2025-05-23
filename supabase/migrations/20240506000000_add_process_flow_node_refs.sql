-- Add process flow node reference columns to habits table
ALTER TABLE habits ADD COLUMN IF NOT EXISTS linked_flow_id UUID;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS linked_node_id TEXT;

-- Add foreign key constraint to process_flows table
ALTER TABLE habits ADD CONSTRAINT fk_linked_flow
    FOREIGN KEY (linked_flow_id)
    REFERENCES process_flows(id)
    ON DELETE SET NULL;

-- Update RLS policies to allow access to linked flows
CREATE POLICY "Users can view linked process flows"
    ON process_flows FOR SELECT
    USING (
        id IN (
            SELECT linked_flow_id 
            FROM habits 
            WHERE user_id = auth.uid()
        )
    ); 