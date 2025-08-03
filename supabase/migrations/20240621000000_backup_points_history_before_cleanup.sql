-- Backup current points history data before cleanup
-- This allows us to revert if the cleanup doesn't work as expected

-- Create backup tables
CREATE TABLE IF NOT EXISTS area_points_history_backup AS 
SELECT * FROM area_points_history;

CREATE TABLE IF NOT EXISTS subarea_points_history_backup AS 
SELECT * FROM subarea_points_history;

CREATE TABLE IF NOT EXISTS goal_points_history_backup AS 
SELECT * FROM goal_points_history;

-- Add indexes to backup tables for performance
CREATE INDEX IF NOT EXISTS area_points_history_backup_area_date_idx 
ON area_points_history_backup(area_id, date);

CREATE INDEX IF NOT EXISTS subarea_points_history_backup_subarea_date_idx 
ON subarea_points_history_backup(subarea_id, date);

CREATE INDEX IF NOT EXISTS goal_points_history_backup_goal_date_idx 
ON goal_points_history_backup(goal_id, date);

-- Log backup results
DO $$
DECLARE
  area_count INTEGER;
  subarea_count INTEGER;
  goal_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO area_count FROM area_points_history_backup;
  SELECT COUNT(*) INTO subarea_count FROM subarea_points_history_backup;
  SELECT COUNT(*) INTO goal_count FROM goal_points_history_backup;
  
  RAISE NOTICE 'Backup complete. Backed up records: area_points_history: %, subarea_points_history: %, goal_points_history: %', 
    area_count, subarea_count, goal_count;
END $$; 