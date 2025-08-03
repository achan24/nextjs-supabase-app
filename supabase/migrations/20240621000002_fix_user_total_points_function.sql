-- Fix get_user_total_points function to only count goal points
-- XP should only be earned from completing goals, not areas or subareas

CREATE OR REPLACE FUNCTION get_user_total_points(p_user_id uuid)
RETURNS numeric AS $$
BEGIN
  -- Only count from goal_points_history since XP should only come from goals
  -- Areas and subareas are just organizational structures
  RETURN COALESCE((
    SELECT SUM(points)
    FROM goal_points_history gph
    JOIN life_goals lg ON gph.goal_id = lg.id
    JOIN life_goal_subareas lgs ON lg.subarea_id = lgs.id
    JOIN life_goal_areas lga ON lgs.area_id = lga.id
    WHERE lga.user_id = p_user_id
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_total_points(uuid) TO authenticated; 