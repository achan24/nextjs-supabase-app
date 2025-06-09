-- Drop existing policies if they exist
drop policy if exists "Users can view their own areas" on life_goal_areas;
drop policy if exists "Users can insert their own areas" on life_goal_areas;
drop policy if exists "Users can update their own areas" on life_goal_areas;
drop policy if exists "Users can delete their own areas" on life_goal_areas;

drop policy if exists "Users can view their own subareas" on life_goal_subareas;
drop policy if exists "Users can insert subareas in their areas" on life_goal_subareas;
drop policy if exists "Users can update their own subareas" on life_goal_subareas;
drop policy if exists "Users can delete their own subareas" on life_goal_subareas;

drop policy if exists "Users can view their own life goals" on life_goals;
drop policy if exists "Users can insert goals in their subareas" on life_goals;
drop policy if exists "Users can update their own life goals" on life_goals;
drop policy if exists "Users can delete their own life goals" on life_goals;

drop policy if exists "Users can view their own milestones" on life_goal_milestones;
drop policy if exists "Users can insert their own milestones" on life_goal_milestones;
drop policy if exists "Users can update their own milestones" on life_goal_milestones;
drop policy if exists "Users can delete their own milestones" on life_goal_milestones;

drop policy if exists "Users can view their own metrics" on life_goal_metrics;
drop policy if exists "Users can insert their own metrics" on life_goal_metrics;
drop policy if exists "Users can update their own metrics" on life_goal_metrics;
drop policy if exists "Users can delete their own metrics" on life_goal_metrics;

drop policy if exists "Users can view their own thresholds" on life_goal_metric_thresholds;
drop policy if exists "Users can insert their own thresholds" on life_goal_metric_thresholds;
drop policy if exists "Users can update their own thresholds" on life_goal_metric_thresholds;
drop policy if exists "Users can delete their own thresholds" on life_goal_metric_thresholds;

-- Recreate policies for areas
create policy "Users can view their own areas"
    on life_goal_areas for select
    using (auth.uid() = user_id);

create policy "Users can insert their own areas"
    on life_goal_areas for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own areas"
    on life_goal_areas for update
    using (auth.uid() = user_id);

create policy "Users can delete their own areas"
    on life_goal_areas for delete
    using (auth.uid() = user_id);

-- Recreate policies for subareas
create policy "Users can view their own subareas"
    on life_goal_subareas for select
    using (exists (
        select 1 from life_goal_areas
        where life_goal_areas.id = life_goal_subareas.area_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can insert subareas in their areas"
    on life_goal_subareas for insert
    with check (exists (
        select 1 from life_goal_areas
        where life_goal_areas.id = life_goal_subareas.area_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can update their own subareas"
    on life_goal_subareas for update
    using (exists (
        select 1 from life_goal_areas
        where life_goal_areas.id = life_goal_subareas.area_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can delete their own subareas"
    on life_goal_subareas for delete
    using (exists (
        select 1 from life_goal_areas
        where life_goal_areas.id = life_goal_subareas.area_id
        and life_goal_areas.user_id = auth.uid()
    ));

-- Recreate policies for goals
create policy "Users can view their own life goals"
    on life_goals for select
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        where life_goal_subareas.id = life_goals.subarea_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can insert goals in their subareas"
    on life_goals for insert
    with check (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        where life_goal_subareas.id = life_goals.subarea_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can update their own life goals"
    on life_goals for update
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        where life_goal_subareas.id = life_goals.subarea_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can delete their own life goals"
    on life_goals for delete
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        where life_goal_subareas.id = life_goals.subarea_id
        and life_goal_areas.user_id = auth.uid()
    ));

-- Recreate policies for milestones
create policy "Users can view their own milestones"
    on life_goal_milestones for select
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_milestones.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can insert their own milestones"
    on life_goal_milestones for insert
    with check (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_milestones.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can update their own milestones"
    on life_goal_milestones for update
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_milestones.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can delete their own milestones"
    on life_goal_milestones for delete
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_milestones.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

-- Recreate policies for metrics
create policy "Users can view their own metrics"
    on life_goal_metrics for select
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_metrics.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can insert their own metrics"
    on life_goal_metrics for insert
    with check (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_metrics.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can update their own metrics"
    on life_goal_metrics for update
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_metrics.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can delete their own metrics"
    on life_goal_metrics for delete
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_metrics.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

-- Recreate policies for metric thresholds
create policy "Users can view their own thresholds"
    on life_goal_metric_thresholds for select
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        join life_goal_metrics on life_goals.id = life_goal_metrics.goal_id
        where life_goal_metrics.id = life_goal_metric_thresholds.metric_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can insert their own thresholds"
    on life_goal_metric_thresholds for insert
    with check (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        join life_goal_metrics on life_goals.id = life_goal_metrics.goal_id
        where life_goal_metrics.id = life_goal_metric_thresholds.metric_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can update their own thresholds"
    on life_goal_metric_thresholds for update
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        join life_goal_metrics on life_goals.id = life_goal_metrics.goal_id
        where life_goal_metrics.id = life_goal_metric_thresholds.metric_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can delete their own thresholds"
    on life_goal_metric_thresholds for delete
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        join life_goal_metrics on life_goals.id = life_goal_metrics.goal_id
        where life_goal_metrics.id = life_goal_metric_thresholds.metric_id
        and life_goal_areas.user_id = auth.uid()
    )); 