-- Projects table
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  title text not null,
  description text,
  priority integer, -- 1-5
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Task-Project relationship
create table if not exists task_projects (
  task_id uuid references tasks(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  primary key (task_id, project_id)
);

-- Enable RLS
alter table projects enable row level security;
alter table task_projects enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view own projects" on projects;
drop policy if exists "Users can create own projects" on projects;
drop policy if exists "Users can update own projects" on projects;
drop policy if exists "Users can delete own projects" on projects;
drop policy if exists "Users can view own task_projects" on task_projects;
drop policy if exists "Users can create own task_projects" on task_projects;
drop policy if exists "Users can delete own task_projects" on task_projects;

-- RLS Policies for projects
create policy "Users can view own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can create own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- RLS Policies for task_projects
create policy "Users can view own task_projects"
  on task_projects for select
  using (
    exists (
      select 1 from projects
      where projects.id = task_projects.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can create own task_projects"
  on task_projects for insert
  with check (
    exists (
      select 1 from projects
      where projects.id = task_projects.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can delete own task_projects"
  on task_projects for delete
  using (
    exists (
      select 1 from projects
      where projects.id = task_projects.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Add updated_at trigger for projects
drop trigger if exists handle_projects_updated_at on projects;
create trigger handle_projects_updated_at
  before update on projects
  for each row
  execute function public.handle_updated_at(); 