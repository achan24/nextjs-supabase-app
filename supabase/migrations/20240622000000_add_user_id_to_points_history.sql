-- Add user_id columns to points history tables
-- These columns are missing but required by the application code

-- Add user_id to area_points_history
ALTER TABLE area_points_history
ADD COLUMN IF NOT EXISTS user_id uuid references auth.users(id);

-- Add user_id to subarea_points_history
ALTER TABLE subarea_points_history
ADD COLUMN IF NOT EXISTS user_id uuid references auth.users(id);

-- Add user_id to goal_points_history
ALTER TABLE goal_points_history
ADD COLUMN IF NOT EXISTS user_id uuid references auth.users(id);

-- Update existing records to populate user_id from parent tables
UPDATE area_points_history aph
SET user_id = lga.user_id
FROM life_goal_areas lga
WHERE aph.area_id = lga.id
AND aph.user_id IS NULL;

UPDATE subarea_points_history sph
SET user_id = lga.user_id
FROM life_goal_areas lga
JOIN life_goal_subareas lgs ON lga.id = lgs.area_id
WHERE sph.subarea_id = lgs.id
AND sph.user_id IS NULL;

UPDATE goal_points_history gph
SET user_id = lga.user_id
FROM life_goal_areas lga
JOIN life_goal_subareas lgs ON lga.id = lgs.area_id
JOIN life_goals lg ON lgs.id = lg.subarea_id
WHERE gph.goal_id = lg.id
AND gph.user_id IS NULL;

-- Make user_id NOT NULL after populating existing records
ALTER TABLE area_points_history
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE subarea_points_history
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE goal_points_history
ALTER COLUMN user_id SET NOT NULL;

-- Add indexes for user_id columns
CREATE INDEX IF NOT EXISTS area_points_history_user_id_idx ON area_points_history(user_id);
CREATE INDEX IF NOT EXISTS subarea_points_history_user_id_idx ON subarea_points_history(user_id);
CREATE INDEX IF NOT EXISTS goal_points_history_user_id_idx ON goal_points_history(user_id); 