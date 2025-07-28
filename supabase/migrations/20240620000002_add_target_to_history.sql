-- Add target column to area points history
ALTER TABLE area_points_history
ADD COLUMN IF NOT EXISTS target numeric;

-- Add target column to subarea points history
ALTER TABLE subarea_points_history
ADD COLUMN IF NOT EXISTS target numeric;

-- Add target column to goal points history
ALTER TABLE goal_points_history
ADD COLUMN IF NOT EXISTS target numeric;

-- Update existing records to copy target from parent tables
UPDATE area_points_history aph
SET target = lga.target_points
FROM life_goal_areas lga
WHERE aph.area_id = lga.id
AND aph.target IS NULL;

UPDATE subarea_points_history sph
SET target = lgs.target_points
FROM life_goal_subareas lgs
WHERE sph.subarea_id = lgs.id
AND sph.target IS NULL;

UPDATE goal_points_history gph
SET target = lg.target_points
FROM life_goals lg
WHERE gph.goal_id = lg.id
AND gph.target IS NULL; 