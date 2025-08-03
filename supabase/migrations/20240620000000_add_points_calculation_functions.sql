-- Function to get total points for an area
CREATE OR REPLACE FUNCTION get_area_total_points(p_area_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(points)
    FROM area_points_history
    WHERE area_id = p_area_id
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total points for a subarea
CREATE OR REPLACE FUNCTION get_subarea_total_points(p_subarea_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(points)
    FROM subarea_points_history
    WHERE subarea_id = p_subarea_id
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total points for a goal
CREATE OR REPLACE FUNCTION get_goal_total_points(p_goal_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(points)
    FROM goal_points_history
    WHERE goal_id = p_goal_id
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total points for a user (across all areas)
CREATE OR REPLACE FUNCTION get_user_total_points(p_user_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT COALESCE(SUM(points), 0)
    FROM (
      SELECT points FROM area_points_history aph
      JOIN life_goal_areas lga ON aph.area_id = lga.id
      WHERE lga.user_id = p_user_id
      UNION ALL
      SELECT points FROM subarea_points_history sph
      JOIN life_goal_subareas lgs ON sph.subarea_id = lgs.id
      JOIN life_goal_areas lga ON lgs.area_id = lga.id
      WHERE lga.user_id = p_user_id
      UNION ALL
      SELECT points FROM goal_points_history gph
      JOIN life_goals lg ON gph.goal_id = lg.id
      JOIN life_goal_subareas lgs ON lg.subarea_id = lgs.id
      JOIN life_goal_areas lga ON lgs.area_id = lga.id
      WHERE lga.user_id = p_user_id
    ) all_points
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_area_total_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subarea_total_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_goal_total_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_total_points(uuid) TO authenticated; 