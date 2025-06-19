-- Create table for task contributions to metrics
create table if not exists life_goal_task_contributions (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade not null,
  metric_id uuid references life_goal_metrics(id) on delete cascade not null,
  contribution_value numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(task_id, metric_id)
);

-- Enable RLS
alter table life_goal_task_contributions enable row level security;

-- Create policies
create policy "Users can view their own task contributions"
  on life_goal_task_contributions for select
  using (exists (
    select 1 from life_goal_areas
    join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
    join life_goals on life_goal_subareas.id = life_goals.subarea_id
    join life_goal_metrics on life_goals.id = life_goal_metrics.goal_id
    where life_goal_metrics.id = life_goal_task_contributions.metric_id
    and life_goal_areas.user_id = auth.uid()
  ));

create policy "Users can insert their own task contributions"
  on life_goal_task_contributions for insert
  with check (exists (
    select 1 from life_goal_areas
    join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
    join life_goals on life_goal_subareas.id = life_goals.subarea_id
    join life_goal_metrics on life_goals.id = life_goal_metrics.goal_id
    where life_goal_metrics.id = life_goal_task_contributions.metric_id
    and life_goal_areas.user_id = auth.uid()
  ));

create policy "Users can delete their own task contributions"
  on life_goal_task_contributions for delete
  using (exists (
    select 1 from life_goal_areas
    join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
    join life_goals on life_goal_subareas.id = life_goals.subarea_id
    join life_goal_metrics on life_goals.id = life_goal_metrics.goal_id
    where life_goal_metrics.id = life_goal_task_contributions.metric_id
    and life_goal_areas.user_id = auth.uid()
  ));

-- Add trigger to update metric values when task status changes
create or replace function update_metric_on_task_status_change()
returns trigger as $$
begin
  -- If task is completed, add contribution value to metric
  if NEW.status = 'completed' and OLD.status != 'completed' then
    update life_goal_metrics
    set current_value = current_value + tc.contribution_value
    from life_goal_task_contributions tc
    where life_goal_metrics.id = tc.metric_id
    and tc.task_id = NEW.id;
  -- If task is uncompleted, subtract contribution value from metric
  elsif NEW.status != 'completed' and OLD.status = 'completed' then
    update life_goal_metrics
    set current_value = current_value - tc.contribution_value
    from life_goal_task_contributions tc
    where life_goal_metrics.id = tc.metric_id
    and tc.task_id = NEW.id;
  end if;
  return NEW;
end;
$$ language plpgsql;

-- Create trigger
create trigger update_metric_on_task_status_change
  after update of status on tasks
  for each row
  execute function update_metric_on_task_status_change();

-- Add indexes
create index life_goal_task_contributions_task_id_idx on life_goal_task_contributions(task_id);
create index life_goal_task_contributions_metric_id_idx on life_goal_task_contributions(metric_id); 