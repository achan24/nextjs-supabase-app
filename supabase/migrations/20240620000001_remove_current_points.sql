-- Remove current_points from life_goal_areas
ALTER TABLE public.life_goal_areas
DROP COLUMN IF EXISTS current_points;

-- Remove current_points from life_goal_subareas
ALTER TABLE public.life_goal_subareas
DROP COLUMN IF EXISTS current_points;

-- Remove current_points from life_goals
ALTER TABLE public.life_goals
DROP COLUMN IF EXISTS current_points; 