-- Fix timeline event ltree path generation
-- The issue is that UUIDs contain hyphens which are not valid in ltree paths
-- We need to convert UUIDs to a valid ltree format

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS set_timeline_event_path_trigger ON timeline_events;
DROP FUNCTION IF EXISTS set_timeline_event_path();

-- Create a new function that properly handles UUID to ltree conversion
CREATE OR REPLACE FUNCTION set_timeline_event_path()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        -- Root event - convert UUID to valid ltree format by removing hyphens
        NEW.path = replace(NEW.id::text, '-', '')::ltree;
        NEW.depth = 0;
    ELSE
        -- Child event - append to parent path
        SELECT path || replace(NEW.id::text, '-', '')::ltree, depth + 1
        INTO NEW.path, NEW.depth
        FROM timeline_events
        WHERE id = NEW.parent_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger
CREATE TRIGGER set_timeline_event_path_trigger
    BEFORE INSERT OR UPDATE OF parent_id ON timeline_events
    FOR EACH ROW EXECUTE FUNCTION set_timeline_event_path();
