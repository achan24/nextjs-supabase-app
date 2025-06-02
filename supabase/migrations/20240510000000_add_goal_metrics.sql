-- Drop old trigger and function if they exist
drop trigger if exists update_goal_metrics_on_task_status_change on tasks;
drop function if exists update_goal_metrics_on_task_status_change();

-- Drop existing policies if they exist
drop policy if exists "Users can view own goal metrics" on goal_metrics;
drop policy if exists "Users can insert own goal metrics" on goal_metrics;
drop policy if exists "Users can update own goal metrics" on goal_metrics;
drop policy if exists "Users can delete own goal metrics" on goal_metrics;
drop policy if exists "Users can view own goal metric tasks" on goal_metric_tasks;
drop policy if exists "Users can insert own goal metric tasks" on goal_metric_tasks;
drop policy if exists "Users can update own goal metric tasks" on goal_metric_tasks;
drop policy if exists "Users can delete own goal metric tasks" on goal_metric_tasks;

-- Create goal_metrics table
create table if not exists goal_metrics (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references goals(id) on delete cascade,
  title text not null,
  description text,
  target_value float not null,
  current_value float default 0,
  unit text not null,
  metric_type text not null, -- 'count', 'percentage', 'time', 'custom'
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create goal_metric_tasks table to track task contributions to metrics
create table if not exists goal_metric_tasks (
  id uuid default gen_random_uuid() primary key,
  metric_id uuid references goal_metrics(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  contribution_value float not null default 1,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(metric_id, task_id)
);

-- Enable RLS
alter table goal_metrics enable row level security;
alter table goal_metric_tasks enable row level security;

-- RLS Policies for goal_metrics
create policy "Users can view own goal metrics"
  on goal_metrics for select
  using (
    auth.uid() in (
      select user_id from goals where id = goal_id
    )
  );

create policy "Users can insert own goal metrics"
  on goal_metrics for insert
  with check (
    auth.uid() in (
      select user_id from goals where id = goal_id
    )
  );

create policy "Users can update own goal metrics"
  on goal_metrics for update
  using (
    auth.uid() in (
      select user_id from goals where id = goal_id
    )
  );

create policy "Users can delete own goal metrics"
  on goal_metrics for delete
  using (
    auth.uid() in (
      select user_id from goals where id = goal_id
    )
  );

-- RLS Policies for goal_metric_tasks
create policy "Users can view own goal metric tasks"
  on goal_metric_tasks for select
  using (
    auth.uid() in (
      select g.user_id from goals g
      join goal_metrics gm on gm.goal_id = g.id
      where gm.id = metric_id
    )
  );

create policy "Users can insert own goal metric tasks"
  on goal_metric_tasks for insert
  with check (
    auth.uid() in (
      select g.user_id from goals g
      join goal_metrics gm on gm.goal_id = g.id
      where gm.id = metric_id
    )
  );

create policy "Users can update own goal metric tasks"
  on goal_metric_tasks for update
  using (
    auth.uid() in (
      select g.user_id from goals g
      join goal_metrics gm on gm.goal_id = g.id
      where gm.id = metric_id
    )
  );

create policy "Users can delete own goal metric tasks"
  on goal_metric_tasks for delete
  using (
    auth.uid() in (
      select g.user_id from goals g
      join goal_metrics gm on gm.goal_id = g.id
      where gm.id = metric_id
    )
  );

-- Add indexes
create index if not exists goal_metrics_goal_id_idx on goal_metrics(goal_id);
create index if not exists goal_metric_tasks_metric_id_idx on goal_metric_tasks(metric_id);
create index if not exists goal_metric_tasks_task_id_idx on goal_metric_tasks(task_id);

-- Drop existing trigger if it exists
drop trigger if exists update_goal_metric_on_task_status_change on tasks;
drop function if exists update_goal_metric_on_task_status_change();

-- Add trigger to update metric values when task status changes
create or replace function update_goal_metric_on_task_status_change()
returns trigger as $$
begin
  -- If task is completed, add contribution value to metric
  if NEW.status = 'completed' and OLD.status != 'completed' then
    update goal_metrics
    set current_value = current_value + gmt.contribution_value
    from goal_metric_tasks gmt
    where goal_metrics.id = gmt.metric_id
    and gmt.task_id = NEW.id;
  -- If task is uncompleted, subtract contribution value from metric
  elsif NEW.status != 'completed' and OLD.status = 'completed' then
    update goal_metrics
    set current_value = current_value - gmt.contribution_value
    from goal_metric_tasks gmt
    where goal_metrics.id = gmt.metric_id
    and gmt.task_id = NEW.id;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger update_goal_metric_on_task_status_change
  after update of status on tasks
  for each row
  execute function update_goal_metric_on_task_status_change(); 