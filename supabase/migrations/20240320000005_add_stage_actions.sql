-- Create table for recommended actions per stage
CREATE TABLE crm_stage_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_id UUID REFERENCES crm_stages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  importance INTEGER NOT NULL DEFAULT 1, -- 1: Optional, 2: Recommended, 3: Essential
  expected_outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for person's action checklist
CREATE TABLE crm_person_stage_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID REFERENCES crm_people(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_action_id UUID REFERENCES crm_stage_actions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, skipped
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT crm_person_stage_actions_user_person_fkey 
    FOREIGN KEY (user_id, person_id) 
    REFERENCES crm_people(user_id, id)
);

-- Add RLS policies
ALTER TABLE crm_stage_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_person_stage_actions ENABLE ROW LEVEL SECURITY;

-- Everyone can read stage actions
CREATE POLICY "Anyone can read stage actions" ON crm_stage_actions
  FOR SELECT USING (true);

-- Users can manage their own person stage actions
CREATE POLICY "Users can manage their own person stage actions" ON crm_person_stage_actions
  FOR ALL USING (user_id = auth.uid());

-- Add indexes
CREATE INDEX crm_stage_actions_stage_id_idx ON crm_stage_actions(stage_id);
CREATE INDEX crm_person_stage_actions_person_id_idx ON crm_person_stage_actions(person_id);
CREATE INDEX crm_person_stage_actions_user_id_idx ON crm_person_stage_actions(user_id);
CREATE INDEX crm_person_stage_actions_stage_action_id_idx ON crm_person_stage_actions(stage_action_id);

-- Add triggers for updated_at
CREATE TRIGGER update_crm_stage_actions_updated_at
  BEFORE UPDATE ON crm_stage_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_person_stage_actions_updated_at
  BEFORE UPDATE ON crm_person_stage_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default stage actions for Romantic track
INSERT INTO crm_stage_actions (stage_id, title, description, importance, expected_outcome) 
SELECT 
  s.id,
  a.title,
  a.description,
  a.importance,
  a.expected_outcome
FROM crm_stages s
CROSS JOIN (
  VALUES
    -- Open stage
    ('Notice and acknowledge', 'Make eye contact, smile, or give a small wave when you see them', 3, 'Establish basic recognition'),
    ('Create opportunities', 'Position yourself in shared spaces or activities where natural interaction can occur', 2, 'Increase chances of natural interaction'),
    ('Observe interests', 'Pay attention to their visible interests (books, style, activities)', 2, 'Gather conversation starters'),
    
    -- Connect stage
    ('Casual conversation', 'Start light conversations about shared context or interests', 3, 'Build basic comfort and rapport'),
    ('Show genuine interest', 'Ask follow-up questions about things they mention', 3, 'Demonstrate attentiveness and care'),
    ('Share basic info', 'Naturally mention some basic things about yourself', 2, 'Create reciprocal sharing'),
    ('Light humor', 'Share appropriate jokes or playful comments', 2, 'Test humor compatibility'),
    
    -- Spike stage
    ('Create intrigue', 'Show unique aspects of yourself that might interest them', 3, 'Generate curiosity and attraction'),
    ('Playful tension', 'Use light teasing or create anticipation', 3, 'Build romantic tension'),
    ('Quality time', 'Create opportunities for one-on-one interaction', 3, 'Deepen connection'),
    ('Physical proximity', 'Gradually reduce physical distance when appropriate', 2, 'Test comfort with closeness'),
    
    -- Qualify stage
    ('Values discussion', 'Have deeper conversations about life goals and values', 3, 'Assess long-term compatibility'),
    ('Share vulnerability', 'Open up about meaningful personal experiences', 3, 'Build emotional intimacy'),
    ('Observe reactions', 'Pay attention to how they handle different situations', 2, 'Understand their character'),
    ('Future exploration', 'Discuss hopes and plans for the future', 2, 'Align life trajectories'),
    
    -- Bond stage
    ('Create memories', 'Plan and share meaningful experiences together', 3, 'Build shared history'),
    ('Meet important people', 'Introduce them to friends/family', 3, 'Integrate into each others lives'),
    ('Show support', 'Be there during both challenges and celebrations', 3, 'Demonstrate reliability'),
    ('Deepen intimacy', 'Share deeper fears and dreams', 2, 'Strengthen emotional connection'),
    
    -- Decide stage
    ('Define relationship', 'Have explicit conversation about commitment', 3, 'Clarify mutual understanding'),
    ('Discuss boundaries', 'Establish relationship agreements', 3, 'Set healthy foundation'),
    ('Plan together', 'Make concrete future plans', 2, 'Demonstrate commitment'),
    ('Regular check-ins', 'Establish communication about relationship health', 2, 'Maintain alignment')
  ) AS a(title, description, importance, expected_outcome)
WHERE s.track_id = '1c37c03a-cc67-4f8c-a3c0-6f668b2e48f2'  -- Romantic track
  AND (
    (s.name = 'Open' AND a.title IN ('Notice and acknowledge', 'Create opportunities', 'Observe interests'))
    OR (s.name = 'Connect' AND a.title IN ('Casual conversation', 'Show genuine interest', 'Share basic info', 'Light humor'))
    OR (s.name = 'Spike' AND a.title IN ('Create intrigue', 'Playful tension', 'Quality time', 'Physical proximity'))
    OR (s.name = 'Qualify' AND a.title IN ('Values discussion', 'Share vulnerability', 'Observe reactions', 'Future exploration'))
    OR (s.name = 'Bond' AND a.title IN ('Create memories', 'Meet important people', 'Show support', 'Deepen intimacy'))
    OR (s.name = 'Decide' AND a.title IN ('Define relationship', 'Discuss boundaries', 'Plan together', 'Regular check-ins'))
  );

-- Insert default stage actions for Friendship track
INSERT INTO crm_stage_actions (stage_id, title, description, importance, expected_outcome) 
SELECT 
  s.id,
  a.title,
  a.description,
  a.importance,
  a.expected_outcome
FROM crm_stages s
CROSS JOIN (
  VALUES
    -- Contact stage
    ('Initial greeting', 'Make friendly first contact in a natural way', 3, 'Break the ice'),
    ('Remember details', 'Note their name and basic context', 3, 'Show personal interest'),
    ('Find commonality', 'Identify shared experiences or interests', 2, 'Create connection points'),
    
    -- Activity stage
    ('Casual invitation', 'Invite to group activity or casual meetup', 3, 'Create shared experiences'),
    ('Show up', 'Attend events or activities theyre part of', 3, 'Demonstrate interest in connection'),
    ('Contribute positively', 'Add value to shared activities', 2, 'Build positive association'),
    
    -- Trust stage
    ('Keep confidences', 'Maintain privacy of shared information', 3, 'Build trust'),
    ('Offer support', 'Be there during challenges', 3, 'Show reliability'),
    ('Share personally', 'Open up about your own experiences', 2, 'Deepen connection'),
    
    -- Shared Identity stage
    ('Create traditions', 'Establish regular activities or inside jokes', 3, 'Build unique friendship identity'),
    ('Integrate circles', 'Connect with each others friends', 3, 'Expand shared community'),
    ('Mark occasions', 'Remember and celebrate important dates', 2, 'Show investment in friendship'),
    
    -- Loyalty stage
    ('Proactive support', 'Anticipate and offer help when needed', 3, 'Demonstrate deep care'),
    ('Celebrate success', 'Genuinely celebrate their achievements', 3, 'Show investment in their growth'),
    ('Navigate challenges', 'Work through disagreements maturely', 3, 'Build resilient friendship')
  ) AS a(title, description, importance, expected_outcome)
WHERE s.track_id = '2d47c03a-cc67-4f8c-a3c0-6f668b2e48f2'  -- Friendship track
  AND (
    (s.name = 'Contact' AND a.title IN ('Initial greeting', 'Remember details', 'Find commonality'))
    OR (s.name = 'Activity' AND a.title IN ('Casual invitation', 'Show up', 'Contribute positively'))
    OR (s.name = 'Trust' AND a.title IN ('Keep confidences', 'Offer support', 'Share personally'))
    OR (s.name = 'Shared Identity' AND a.title IN ('Create traditions', 'Integrate circles', 'Mark occasions'))
    OR (s.name = 'Loyalty' AND a.title IN ('Proactive support', 'Celebrate success', 'Navigate challenges'))
  );

-- Insert default stage actions for Social Expansion track
INSERT INTO crm_stage_actions (stage_id, title, description, importance, expected_outcome) 
SELECT 
  s.id,
  a.title,
  a.description,
  a.importance,
  a.expected_outcome
FROM crm_stages s
CROSS JOIN (
  VALUES
    -- Spot stage
    ('Identify potential', 'Look for people who could be valuable connections', 3, 'Build awareness of social opportunities'),
    ('Observe dynamics', 'Notice how they interact with others', 2, 'Understand their social style'),
    ('Map connections', 'Note their existing social network', 2, 'Find potential connection points'),
    
    -- Ping stage
    ('Social media engage', 'Like or comment on their posts appropriately', 2, 'Establish online presence'),
    ('Light interaction', 'Brief greetings or small talk in shared spaces', 3, 'Create familiarity'),
    ('Show recognition', 'Acknowledge them in group settings', 2, 'Build mutual awareness'),
    
    -- Test stage
    ('Value exchange', 'Share useful information or resources', 3, 'Demonstrate potential value'),
    ('Group participation', 'Engage positively in shared activities', 3, 'Show social competence'),
    ('Gauge interest', 'Test receptiveness to deeper connection', 2, 'Assess mutual interest'),
    
    -- Hook stage
    ('Create context', 'Establish shared interests or goals', 3, 'Build reason for connection'),
    ('Mutual contacts', 'Connect through shared friends/colleagues', 3, 'Leverage social proof'),
    ('Future bridge', 'Plant seeds for future interaction', 2, 'Create ongoing connection points'),
    
    -- Recur stage
    ('Regular presence', 'Maintain consistent visibility', 3, 'Build familiarity'),
    ('Add value', 'Contribute positively to their network', 3, 'Become valuable connection'),
    ('Natural integration', 'Become part of their social ecosystem', 2, 'Establish lasting connection')
  ) AS a(title, description, importance, expected_outcome)
WHERE s.track_id = '3e57c03a-cc67-4f8c-a3c0-6f668b2e48f2'  -- Social Expansion track
  AND (
    (s.name = 'Spot' AND a.title IN ('Identify potential', 'Observe dynamics', 'Map connections'))
    OR (s.name = 'Ping' AND a.title IN ('Social media engage', 'Light interaction', 'Show recognition'))
    OR (s.name = 'Test' AND a.title IN ('Value exchange', 'Group participation', 'Gauge interest'))
    OR (s.name = 'Hook' AND a.title IN ('Create context', 'Mutual contacts', 'Future bridge'))
    OR (s.name = 'Recur' AND a.title IN ('Regular presence', 'Add value', 'Natural integration'))
  );

-- Insert default stage actions for Mentor track
INSERT INTO crm_stage_actions (stage_id, title, description, importance, expected_outcome) 
SELECT 
  s.id,
  a.title,
  a.description,
  a.importance,
  a.expected_outcome
FROM crm_stages s
CROSS JOIN (
  VALUES
    -- Intro stage
    ('Research background', 'Learn about their work and achievements', 3, 'Show genuine interest and preparation'),
    ('Initial contact', 'Make professional first contact', 3, 'Establish credibility'),
    ('Clear intention', 'Express specific interest in their expertise', 2, 'Set clear expectations'),
    
    -- Value stage
    ('Show potential', 'Demonstrate your capability and drive', 3, 'Prove worth investing time'),
    ('Ask thoughtfully', 'Prepare specific, well-researched questions', 3, 'Show respect for their time'),
    ('Quick wins', 'Apply their initial advice effectively', 2, 'Demonstrate action-taking'),
    
    -- Conversation stage
    ('Share progress', 'Update them on how youve used their guidance', 3, 'Show value of their input'),
    ('Seek insight', 'Ask about their experiences and lessons', 3, 'Deepen professional relationship'),
    ('Add perspective', 'Share relevant observations or ideas', 2, 'Begin contributing value'),
    
    -- Relationship stage
    ('Consistent growth', 'Show steady professional development', 3, 'Build long-term credibility'),
    ('Reliable follow-through', 'Execute on their recommendations', 3, 'Prove trustworthiness'),
    ('Expand dialogue', 'Discuss broader professional topics', 2, 'Develop peer aspects'),
    
    -- Mutuality stage
    ('Return value', 'Find ways to help them', 3, 'Balance the relationship'),
    ('Network contribution', 'Connect them with valuable contacts', 3, 'Become valuable to them'),
    ('Independent growth', 'Develop unique professional strengths', 2, 'Evolve the relationship')
  ) AS a(title, description, importance, expected_outcome)
WHERE s.track_id = '4f67c03a-cc67-4f8c-a3c0-6f668b2e48f2'  -- Mentor track
  AND (
    (s.name = 'Intro' AND a.title IN ('Research background', 'Initial contact', 'Clear intention'))
    OR (s.name = 'Value' AND a.title IN ('Show potential', 'Ask thoughtfully', 'Quick wins'))
    OR (s.name = 'Conversation' AND a.title IN ('Share progress', 'Seek insight', 'Add perspective'))
    OR (s.name = 'Relationship' AND a.title IN ('Consistent growth', 'Reliable follow-through', 'Expand dialogue'))
    OR (s.name = 'Mutuality' AND a.title IN ('Return value', 'Network contribution', 'Independent growth'))
  ); 