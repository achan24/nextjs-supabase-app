-- Add daily points tracking to life_goal_areas
alter table public.life_goal_areas
add column if not exists daily_points numeric not null default 0,
add column if not exists daily_target numeric not null default 0;

-- Add daily points tracking to life_goal_subareas
alter table public.life_goal_subareas
add column if not exists daily_points numeric not null default 0,
add column if not exists daily_target numeric not null default 0;

-- Add daily points tracking to life_goals
alter table public.life_goals
add column if not exists daily_points numeric not null default 0,
add column if not exists daily_target numeric not null default 0;