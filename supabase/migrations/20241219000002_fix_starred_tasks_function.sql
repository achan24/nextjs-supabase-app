-- Fix the starred tasks function to use correct table relationships
-- Tasks are linked to goals through life_goal_tasks junction table, not directly

-- Drop the existing function
DROP FUNCTION IF EXISTS get_starred_tasks_for_today(UUID);

-- Create the corrected version using proper table relationships
CREATE OR REPLACE FUNCTION get_starred_tasks_for_today(user_uuid UUID)
RETURNS TABLE (
  task_id UUID,
  title TEXT,
  description TEXT,
  points NUMERIC,
  goal_title TEXT,
  subarea_title TEXT,
  area_title TEXT,
  area_icon TEXT,
  starred_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Add timeout protection
  SET statement_timeout = '5s';
  
  RETURN QUERY
  SELECT 
    t.id as task_id,
    t.title,
    t.description,
    COALESCE(lgt.time_worth, 0) as points,
    lg.title as goal_title,
    lgs.title as subarea_title,
    lga.title as area_title,
    lga.icon as area_icon,
    t.starred_at
  FROM tasks t
  INNER JOIN life_goal_tasks lgt ON t.id = lgt.task_id
  INNER JOIN life_goals lg ON lgt.goal_id = lg.id
  INNER JOIN life_goal_subareas lgs ON lg.subarea_id = lgs.id
  INNER JOIN life_goal_areas lga ON lgs.area_id = lga.id
  WHERE t.user_id = user_uuid
    AND t.is_starred_for_today = TRUE
    AND t.starred_at IS NOT NULL
    AND DATE(t.starred_at) = CURRENT_DATE
  ORDER BY t.starred_at ASC
  LIMIT 50; -- Add limit to prevent large result sets
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove the incorrect index that referenced non-existent goal_id column
DROP INDEX IF EXISTS idx_tasks_goal_id;

-- Add correct indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_starred_date ON tasks(user_id, is_starred_for_today, starred_at) 
WHERE is_starred_for_today = TRUE;

CREATE INDEX IF NOT EXISTS idx_life_goal_tasks_task_id ON life_goal_tasks(task_id);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_starred_tasks_for_today(UUID) TO authenticated; 