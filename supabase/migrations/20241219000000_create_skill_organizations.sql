-- Create skill_organizations table for custom skill organization
CREATE TABLE IF NOT EXISTS public.skill_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('folder', 'skill', 'target')),
  parent_id UUID REFERENCES skill_organizations(id) ON DELETE CASCADE,
  skill_id TEXT,
  flow_id TEXT,
  data JSONB,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_expanded BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS skill_organizations_user_id_idx ON skill_organizations(user_id);
CREATE INDEX IF NOT EXISTS skill_organizations_parent_id_idx ON skill_organizations(parent_id);
CREATE INDEX IF NOT EXISTS skill_organizations_display_order_idx ON skill_organizations(display_order);
CREATE INDEX IF NOT EXISTS skill_organizations_skill_id_idx ON skill_organizations(skill_id);

-- Enable RLS
ALTER TABLE skill_organizations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own skill organizations"
  ON skill_organizations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own skill organizations"
  ON skill_organizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skill organizations"
  ON skill_organizations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skill organizations"
  ON skill_organizations FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_skill_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_skill_organizations_updated_at
  BEFORE UPDATE ON skill_organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_skill_organizations_updated_at(); 