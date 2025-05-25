-- Create goals table
create table if not exists goals (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id),
  title text not null,
  description text,
  target_date timestamp with time zone,
  status text not null default 'not_started',
  metrics jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create task time entries table
create table if not exists task_time_entries (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references auth.users(id),
  duration integer not null, -- in seconds
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table goals enable row level security;
alter table task_time_entries enable row level security;

-- RLS Policies for goals
create policy "Users can view own goals"
  on goals for select
  using (auth.uid() = user_id);

create policy "Users can insert own goals"
  on goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own goals"
  on goals for update
  using (auth.uid() = user_id);

create policy "Users can delete own goals"
  on goals for delete
  using (auth.uid() = user_id);

-- RLS Policies for task time entries
create policy "Users can view own time entries"
  on task_time_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own time entries"
  on task_time_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own time entries"
  on task_time_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own time entries"
  on task_time_entries for delete
  using (auth.uid() = user_id);

-- Add indexes
create index goals_project_id_idx on goals(project_id);
create index goals_user_id_idx on goals(user_id);
create index task_time_entries_task_id_idx on task_time_entries(task_id);
create index task_time_entries_user_id_idx on task_time_entries(user_id);
create index task_time_entries_created_at_idx on task_time_entries(created_at); 