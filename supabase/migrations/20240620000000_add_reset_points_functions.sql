-- Function to reset subarea daily points for a user
create or replace function reset_subarea_daily_points(p_user_id uuid)
returns void
security definer
as $$
begin
  update life_goal_subareas
  set daily_points = 0
  where area_id in (
    select id from life_goal_areas
    where user_id = p_user_id
  );
end;
$$ language plpgsql;

-- Function to reset goal daily points for a user
create or replace function reset_goal_daily_points(p_user_id uuid)
returns void
security definer
as $$
begin
  update life_goals
  set daily_points = 0
  where subarea_id in (
    select s.id
    from life_goal_areas a
    join life_goal_subareas s on s.area_id = a.id
    where a.user_id = p_user_id
  );
end;
$$ language plpgsql;

-- Grant execute permissions to authenticated users
grant execute on function reset_subarea_daily_points(uuid) to authenticated;
grant execute on function reset_goal_daily_points(uuid) to authenticated; 