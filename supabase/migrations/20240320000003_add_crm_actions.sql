-- Create enum for action types
CREATE TYPE action_type AS ENUM (
  'meetup',
  'call',
  'message',
  'activity',
  'gift',
  'support',
  'introduction',
  'other'
);

-- Create enum for emotional responses
CREATE TYPE emotional_response AS ENUM (
  'very_negative',
  'negative',
  'neutral',
  'positive',
  'very_positive'
);

-- Create actions table
CREATE TABLE crm_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES crm_people(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES crm_tracks(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES crm_stages(id) ON DELETE CASCADE,
  type action_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  planned_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- JSON string for recurrence rules
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT crm_actions_user_person_fkey FOREIGN KEY (user_id, person_id) REFERENCES crm_people(user_id, id)
);

-- Create action feedback table
CREATE TABLE crm_action_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id UUID NOT NULL REFERENCES crm_actions(id) ON DELETE CASCADE,
  what_went_well TEXT[],
  what_went_wrong TEXT[],
  their_reaction TEXT NOT NULL,
  emotional_response emotional_response NOT NULL,
  self_rating INTEGER NOT NULL CHECK (self_rating BETWEEN 1 AND 5),
  future_adjustments TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX crm_actions_user_id_idx ON crm_actions(user_id);
CREATE INDEX crm_actions_person_id_idx ON crm_actions(person_id);
CREATE INDEX crm_actions_track_id_idx ON crm_actions(track_id);
CREATE INDEX crm_actions_stage_id_idx ON crm_actions(stage_id);
CREATE INDEX crm_actions_planned_date_idx ON crm_actions(planned_date);
CREATE INDEX crm_action_feedback_action_id_idx ON crm_action_feedback(action_id);

-- Add RLS policies
ALTER TABLE crm_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_action_feedback ENABLE ROW LEVEL SECURITY;

-- Users can manage their own actions
CREATE POLICY manage_own_actions ON crm_actions
  FOR ALL USING (user_id = auth.uid());

-- Users can manage feedback for their own actions
CREATE POLICY manage_own_action_feedback ON crm_action_feedback
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM crm_actions
      WHERE crm_actions.id = crm_action_feedback.action_id
      AND crm_actions.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_crm_actions_updated_at
  BEFORE UPDATE ON crm_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_action_feedback_updated_at
  BEFORE UPDATE ON crm_action_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 