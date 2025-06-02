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

-- Drop existing policies if they exist
drop policy if exists "Users can view own goal tasks" on goal_tasks;
drop policy if exists "Users can insert own goal tasks" on goal_tasks;
drop policy if exists "Users can update own goal tasks" on goal_tasks;
drop policy if exists "Users can delete own goal tasks" on goal_tasks;

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
create index if not exists goal_tasks_goal_id_idx on goal_tasks(goal_id);
create index if not exists goal_tasks_task_id_idx on goal_tasks(task_id); 