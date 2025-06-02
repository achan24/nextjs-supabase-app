-- Create enum types for relationship roles and stages
CREATE TYPE relationship_role AS ENUM (
  'romantic', 'friend', 'acquaintance', 'mentor', 'mentee', 'professional'
);

CREATE TYPE relationship_status AS ENUM (
  'active', 'inactive', 'archived'
);

-- Create the people table
CREATE TABLE crm_people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT,
  role relationship_role NOT NULL,
  status relationship_status DEFAULT 'active',
  first_met_date TIMESTAMP WITH TIME ZONE,
  first_met_context TEXT,
  location TEXT,
  birthday DATE,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the metadata table for interests, personality traits, etc.
CREATE TABLE crm_person_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID REFERENCES crm_people(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- interests, personality, values, emotional_hooks, conversation_starters
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the relationship tracks table
CREATE TABLE crm_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create the stages table
CREATE TABLE crm_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_id UUID REFERENCES crm_tracks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the person tracks table (linking people to tracks and their current stage)
CREATE TABLE crm_person_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID REFERENCES crm_people(id) ON DELETE CASCADE,
  track_id UUID REFERENCES crm_tracks(id) ON DELETE CASCADE,
  current_stage_id UUID REFERENCES crm_stages(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_progress_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the actions table
CREATE TABLE crm_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID REFERENCES crm_people(id) ON DELETE CASCADE,
  track_id UUID REFERENCES crm_tracks(id),
  stage_id UUID REFERENCES crm_stages(id),
  type TEXT NOT NULL, -- planned, completed
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the action feedback table
CREATE TABLE crm_action_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id UUID REFERENCES crm_actions(id) ON DELETE CASCADE,
  what_went_right TEXT,
  what_went_wrong TEXT,
  their_reaction TEXT,
  emotional_response TEXT,
  self_rating INTEGER CHECK (self_rating BETWEEN 1 AND 5),
  future_adjustments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE crm_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_person_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_person_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_action_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own CRM people"
  ON crm_people
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own person metadata"
  ON crm_person_metadata
  FOR ALL
  USING (person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid()))
  WITH CHECK (person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own tracks"
  ON crm_tracks
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage stages in their tracks"
  ON crm_stages
  FOR ALL
  USING (track_id IN (SELECT id FROM crm_tracks WHERE user_id = auth.uid()))
  WITH CHECK (track_id IN (SELECT id FROM crm_tracks WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own person tracks"
  ON crm_person_tracks
  FOR ALL
  USING (person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid()))
  WITH CHECK (person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own actions"
  ON crm_actions
  FOR ALL
  USING (person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid()))
  WITH CHECK (person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own action feedback"
  ON crm_action_feedback
  FOR ALL
  USING (action_id IN (SELECT id FROM crm_actions WHERE person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid())))
  WITH CHECK (action_id IN (SELECT id FROM crm_actions WHERE person_id IN (SELECT id FROM crm_people WHERE user_id = auth.uid())));

-- Create indexes
CREATE INDEX crm_people_user_id_idx ON crm_people(user_id);
CREATE INDEX crm_person_metadata_person_id_idx ON crm_person_metadata(person_id);
CREATE INDEX crm_tracks_user_id_idx ON crm_tracks(user_id);
CREATE INDEX crm_stages_track_id_idx ON crm_stages(track_id);
CREATE INDEX crm_person_tracks_person_id_idx ON crm_person_tracks(person_id);
CREATE INDEX crm_actions_person_id_idx ON crm_actions(person_id);
CREATE INDEX crm_action_feedback_action_id_idx ON crm_action_feedback(action_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating updated_at
CREATE TRIGGER update_crm_people_updated_at
  BEFORE UPDATE ON crm_people
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 