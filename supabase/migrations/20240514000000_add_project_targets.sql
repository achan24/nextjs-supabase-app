-- Create project_targets table for linking targets to projects
create table if not exists project_targets (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  target_id uuid references targets(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  unique(project_id, target_id)
);

-- Enable RLS
alter table project_targets enable row level security;

-- Create policies
create policy "Users can view own project targets"
  on project_targets for select
  using (auth.uid() = user_id);

create policy "Users can insert own project targets"
  on project_targets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own project targets"
  on project_targets for update
  using (auth.uid() = user_id);

create policy "Users can delete own project targets"
  on project_targets for delete
  using (auth.uid() = user_id);

-- Add indexes
create index project_targets_project_id_idx on project_targets(project_id);
create index project_targets_target_id_idx on project_targets(target_id);
create index project_targets_user_id_idx on project_targets(user_id); 