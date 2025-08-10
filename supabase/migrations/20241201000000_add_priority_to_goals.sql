-- Add priority field to life_goal_subareas table
ALTER TABLE life_goal_subareas 
ADD COLUMN priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 5);

-- Add priority field to life_goals table  
ALTER TABLE life_goals 
ADD COLUMN priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 5);

-- Create indexes for better performance when sorting by priority
CREATE INDEX idx_life_goal_subareas_priority ON life_goal_subareas(priority);
CREATE INDEX idx_life_goals_priority ON life_goals(priority);

-- Add composite indexes for priority + other common filters
CREATE INDEX idx_life_goal_subareas_area_priority ON life_goal_subareas(area_id, priority);
CREATE INDEX idx_life_goals_subarea_priority ON life_goals(subarea_id, priority);
