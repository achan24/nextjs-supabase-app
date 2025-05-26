-- Create goal_tasks table
create table if not exists goal_tasks (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references goals(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  time_worth float not null default 1,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(goal_id, task_id)
);

-- Enable RLS
alter table goal_tasks enable row level security;

-- RLS Policies for goal_tasks
create policy "Users can view own goal tasks"
  on goal_tasks for select
  using (
    auth.uid() in (
      select user_id from goals where id = goal_id
    )
  );

create policy "Users can insert own goal tasks"
  on goal_tasks for insert
  with check (
    auth.uid() in (
      select user_id from goals where id = goal_id
    )
  );

create policy "Users can update own goal tasks"
  on goal_tasks for update
  using (
    auth.uid() in (
      select user_id from goals where id = goal_id
    )
  );

create policy "Users can delete own goal tasks"
  on goal_tasks for delete
  using (
    auth.uid() in (
      select user_id from goals where id = goal_id
    )
  );

-- Add indexes
create index goal_tasks_goal_id_idx on goal_tasks(goal_id);
create index goal_tasks_task_id_idx on goal_tasks(task_id);

-- Add trigger to update goal metrics when task status changes
create or replace function update_goal_metrics_on_task_status_change()
returns trigger as $$
begin
  -- If task is completed, add time_worth to goal metrics
  if NEW.status = 'completed' and OLD.status != 'completed' then
    update goals
    set metrics = jsonb_set(
      metrics,
      '{current}',
      to_jsonb(
        (metrics->>'current')::float +
        (select time_worth from goal_tasks where task_id = NEW.id)
      )
    )
    where id in (
      select goal_id from goal_tasks where task_id = NEW.id
    );
  -- If task is uncompleted, subtract time_worth from goal metrics
  elsif NEW.status != 'completed' and OLD.status = 'completed' then
    update goals
    set metrics = jsonb_set(
      metrics,
      '{current}',
      to_jsonb(
        (metrics->>'current')::float -
        (select time_worth from goal_tasks where task_id = NEW.id)
      )
    )
    where id in (
      select goal_id from goal_tasks where task_id = NEW.id
    );
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger update_goal_metrics_on_task_status_change
  after update of status on tasks
  for each row
  execute function update_goal_metrics_on_task_status_change(); 