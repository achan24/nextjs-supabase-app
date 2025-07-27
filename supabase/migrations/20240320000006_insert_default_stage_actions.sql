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
WHERE s.track_id = (SELECT id FROM crm_tracks WHERE name = 'Romantic')
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
    ('Show up', 'Attend events or activities they are part of', 3, 'Demonstrate interest in connection'),
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
WHERE s.track_id = (SELECT id FROM crm_tracks WHERE name = 'Friendship')
  AND (
    (s.name = 'Contact' AND a.title IN ('Initial greeting', 'Remember details', 'Find commonality'))
    OR (s.name = 'Activity' AND a.title IN ('Casual invitation', 'Show up', 'Contribute positively'))
    OR (s.name = 'Trust' AND a.title IN ('Keep confidences', 'Offer support', 'Share personally'))
    OR (s.name = 'Shared Identity' AND a.title IN ('Create traditions', 'Integrate circles', 'Mark occasions'))
    OR (s.name = 'Loyalty' AND a.title IN ('Proactive support', 'Celebrate success', 'Navigate challenges'))
  ); 