-- Create timeline tables for branching timeline functionality
-- This migration creates the core tables for the Timeline Explorer feature

-- Enable ltree extension for hierarchical path queries
CREATE EXTENSION IF NOT EXISTS ltree;

-- Create timelines table
CREATE TABLE timelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    tags TEXT[],
    metadata JSONB,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create timeline_events table with hierarchical support
CREATE TABLE timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ,
    event_type TEXT NOT NULL DEFAULT 'event' CHECK (event_type IN ('event', 'decision', 'milestone', 'note')),
    parent_id UUID REFERENCES timeline_events(id) ON DELETE CASCADE,
    path LTREE,
    depth INTEGER NOT NULL DEFAULT 0,
    position JSONB,
    tags TEXT[],
    metadata JSONB,
    is_collapsed BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX timelines_user_id_idx ON timelines(user_id);
CREATE INDEX timelines_tags_idx ON timelines USING gin(tags);
CREATE INDEX timelines_date_range_idx ON timelines(start_date, end_date);

CREATE INDEX timeline_events_timeline_id_idx ON timeline_events(timeline_id);
CREATE INDEX timeline_events_parent_id_idx ON timeline_events(parent_id);
CREATE INDEX timeline_events_path_idx ON timeline_events USING gist(path);
CREATE INDEX timeline_events_depth_idx ON timeline_events(depth);
CREATE INDEX timeline_events_date_idx ON timeline_events(event_date);
CREATE INDEX timeline_events_tags_idx ON timeline_events USING gin(tags);
CREATE INDEX timeline_events_user_id_idx ON timeline_events(user_id);
CREATE INDEX timeline_events_type_idx ON timeline_events(event_type);

-- Create RLS policies
ALTER TABLE timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- Timeline policies
CREATE POLICY "Users can manage their own timelines" ON timelines
    FOR ALL USING (auth.uid() = user_id);

-- Timeline events policies
CREATE POLICY "Users can manage their own timeline events" ON timeline_events
    FOR ALL USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_timelines_updated_at BEFORE UPDATE ON timelines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_events_updated_at BEFORE UPDATE ON timeline_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically set path and depth for timeline events
CREATE OR REPLACE FUNCTION set_timeline_event_path()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        -- Root event
        NEW.path = NEW.id::text::ltree;
        NEW.depth = 0;
    ELSE
        -- Child event
        SELECT path || NEW.id::text::ltree, depth + 1
        INTO NEW.path, NEW.depth
        FROM timeline_events
        WHERE id = NEW.parent_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for path and depth
CREATE TRIGGER set_timeline_event_path_trigger
    BEFORE INSERT OR UPDATE OF parent_id ON timeline_events
    FOR EACH ROW EXECUTE FUNCTION set_timeline_event_path();
