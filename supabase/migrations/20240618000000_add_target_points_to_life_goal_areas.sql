-- Add target_points and current_points to life_goal_areas
ALTER TABLE public.life_goal_areas ADD COLUMN IF NOT EXISTS target_points numeric NOT NULL DEFAULT 0;
ALTER TABLE public.life_goal_areas ADD COLUMN IF NOT EXISTS current_points numeric NOT NULL DEFAULT 0;

-- Add target_points and current_points to life_goal_subareas
ALTER TABLE public.life_goal_subareas ADD COLUMN IF NOT EXISTS target_points numeric NOT NULL DEFAULT 0;
ALTER TABLE public.life_goal_subareas ADD COLUMN IF NOT EXISTS current_points numeric NOT NULL DEFAULT 0; 