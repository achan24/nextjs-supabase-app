-- Add missing get_goal_daily_points function
-- This function returns the daily points for a specific goal

CREATE OR REPLACE FUNCTION get_goal_daily_points(goal_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE((
    SELECT daily_points
    FROM life_goals
    WHERE id = goal_id
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_goal_daily_points(UUID) TO authenticated; 