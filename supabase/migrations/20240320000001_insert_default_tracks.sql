-- Insert default tracks
INSERT INTO crm_tracks (id, name, description) VALUES
  ('1c37c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Romantic', 'Track romantic relationships through stages from initial spark to deep connection'),
  ('2d47c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Friendship', 'Develop meaningful friendships from first contact to lasting loyalty'),
  ('3e57c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Social Expansion', 'Turn acquaintances into valuable connections in your social circle'),
  ('4f67c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Mentor / Network', 'Build professional relationships from introduction to mutual growth')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Insert default stages for Romantic track
INSERT INTO crm_stages (track_id, name, description, order_index) VALUES
  ('1c37c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Open', 'Initial interest/curiosity. You notice them or have brief interactions. No substantial contact yet.', 0),
  ('1c37c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Connect', 'Regular communication, getting comfortable. May include group hangouts, casual chats, social media interaction.', 1),
  ('1c37c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Spike', 'Building attraction and chemistry. First dates, flirting, creating moments of tension and excitement.', 2),
  ('1c37c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Qualify', 'Exploring compatibility. Deep conversations, understanding values, seeing how you fit into each other''s lives.', 3),
  ('1c37c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Bond', 'Growing emotional intimacy. Sharing vulnerabilities, creating shared experiences, meeting important people.', 4),
  ('1c37c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Decide', 'Defining the relationship. Discussing exclusivity, future plans, and commitment level.', 5)
ON CONFLICT (track_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

-- Insert default stages for Friendship track
INSERT INTO crm_stages (track_id, name, description, order_index) VALUES
  ('2d47c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Contact', 'First meaningful interactions. Moving past acquaintance to intentional connection.', 0),
  ('2d47c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Activity', 'Doing things together. Shared experiences, hobbies, or regular meetups.', 1),
  ('2d47c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Trust', 'Opening up emotionally. Sharing personal stories, concerns, and celebrations.', 2),
  ('2d47c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Shared Identity', 'Creating friendship rituals. Inside jokes, regular traditions, mutual friends.', 3),
  ('2d47c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Loyalty', 'Deep mutual support. Being there in tough times, celebrating successes, reliable presence.', 4)
ON CONFLICT (track_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

-- Insert default stages for Social track
INSERT INTO crm_stages (track_id, name, description, order_index) VALUES
  ('3e57c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Spot', 'Identifying potential connections. People you regularly see or share mutual contacts with.', 0),
  ('3e57c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Ping', 'Light social contact. Small talk, social media engagement, group interactions.', 1),
  ('3e57c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Test', 'Initial social exchanges. Brief conversations, finding common interests.', 2),
  ('3e57c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Hook', 'Creating future contact points. Finding reasons to connect again, shared activities.', 3),
  ('3e57c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Recur', 'Regular social presence. Consistent casual interaction, part of your social ecosystem.', 4)
ON CONFLICT (track_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

-- Insert default stages for Mentor track
INSERT INTO crm_stages (track_id, name, description, order_index) VALUES
  ('4f67c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Intro', 'Professional introduction. Establishing basic connection and credibility.', 0),
  ('4f67c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Value', 'Demonstrating potential. Sharing insights, showing genuine interest in their expertise.', 1),
  ('4f67c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Conversation', 'Meaningful exchanges. In-depth discussions about field, challenges, opportunities.', 2),
  ('4f67c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Relationship', 'Building trust. Regular valuable interactions, seeking and following advice.', 3),
  ('4f67c03a-cc67-4f8c-a3c0-6f668b2e48f2', 'Mutuality', 'Two-way growth. Contributing back, becoming a valuable part of their network.', 4)
ON CONFLICT (track_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index; 