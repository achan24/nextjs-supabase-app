-- Add starring functionality to tasks table
-- This allows users to star tasks for today's focus

-- Add starred fields to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_starred_for_today BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS starred_at TIMESTAMPTZ;

-- Add index for efficient querying of starred tasks
CREATE INDEX IF NOT EXISTS idx_tasks_starred_today ON tasks(user_id, is_starred_for_today) 
WHERE is_starred_for_today = TRUE;

-- Function to get starred tasks for today
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
  RETURN QUERY
  SELECT 
    t.id as task_id,
    t.title,
    t.description,
    COALESCE(t.points, 0) as points,
    lg.title as goal_title,
    lgs.title as subarea_title,
    lga.title as area_title,
    lga.icon as area_icon,
    t.starred_at
  FROM tasks t
  JOIN life_goals lg ON t.goal_id = lg.id
  JOIN life_goal_subareas lgs ON lg.subarea_id = lgs.id
  JOIN life_goal_areas lga ON lgs.area_id = lga.id
  WHERE t.user_id = user_uuid
  AND t.is_starred_for_today = TRUE
  AND DATE(t.starred_at) = CURRENT_DATE
  ORDER BY t.starred_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to star/unstar a task
CREATE OR REPLACE FUNCTION toggle_task_star(
  task_uuid UUID,
  user_uuid UUID,
  star_it BOOLEAN
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE tasks 
  SET is_starred_for_today = star_it,
      starred_at = CASE WHEN star_it THEN NOW() ELSE NULL END,
      updated_at = NOW()
  WHERE id = task_uuid AND user_id = user_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_starred_tasks_for_today(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_task_star(UUID, UUID, BOOLEAN) TO authenticated; 