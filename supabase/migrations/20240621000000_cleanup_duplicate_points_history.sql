-- Clean up duplicate entries in points history tables
-- Keep only the most recent entry for each area/subarea/goal per day

-- Clean up area_points_history duplicates
DELETE FROM area_points_history 
WHERE id NOT IN (
  SELECT DISTINCT ON (area_id, date) id
  FROM area_points_history
  ORDER BY area_id, date, created_at DESC
);

-- Clean up subarea_points_history duplicates  
DELETE FROM subarea_points_history
WHERE id NOT IN (
  SELECT DISTINCT ON (subarea_id, date) id
  FROM subarea_points_history
  ORDER BY subarea_id, date, created_at DESC
);

-- Clean up goal_points_history duplicates
DELETE FROM goal_points_history
WHERE id NOT IN (
  SELECT DISTINCT ON (goal_id, date) id
  FROM goal_points_history
  ORDER BY goal_id, date, created_at DESC
);

-- Log the cleanup results
DO $$
DECLARE
  area_count INTEGER;
  subarea_count INTEGER;
  goal_count INTEGER;
BEGIN
  -- Count remaining records
  SELECT COUNT(*) INTO area_count FROM area_points_history;
  SELECT COUNT(*) INTO subarea_count FROM subarea_points_history;
  SELECT COUNT(*) INTO goal_count FROM goal_points_history;
  
  RAISE NOTICE 'Cleanup complete. Remaining records: area_points_history: %, subarea_points_history: %, goal_points_history: %', 
    area_count, subarea_count, goal_count;
END $$; 