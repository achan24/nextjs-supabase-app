-- Compute total points primarily from goal_points_history (authoritative for XP),
-- but fall back to area_points_history totals for dates where no goal history was recorded.
-- This preserves historical XP without fabricating per-goal breakdowns.

create or replace function public.get_user_total_points(p_user_id uuid)
returns numeric
language plpgsql
security definer
as $$
begin
  return coalesce(
    (
      select coalesce(sum(gph.points), 0)
      from goal_points_history gph
      join life_goals lg on gph.goal_id = lg.id
      join life_goal_subareas lgs on lg.subarea_id = lgs.id
      join life_goal_areas lga on lgs.area_id = lga.id
      where lga.user_id = p_user_id
    ), 0
  )
  + coalesce(
    (
      select coalesce(sum(aph.points), 0)
      from area_points_history aph
      join life_goal_areas lga on aph.area_id = lga.id
      where lga.user_id = p_user_id
        and not exists (
          select 1
          from goal_points_history g2
          join life_goals lg2 on g2.goal_id = lg2.id
          join life_goal_subareas lgs2 on lg2.subarea_id = lgs2.id
          join life_goal_areas lga2 on lgs2.area_id = lga2.id
          where lga2.user_id = p_user_id
            and g2.date = aph.date
        )
    ), 0
  );
end;
$$;

grant execute on function public.get_user_total_points(uuid) to authenticated;


