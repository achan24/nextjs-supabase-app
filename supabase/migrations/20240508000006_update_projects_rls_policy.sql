-- Drop all existing policies
drop policy if exists "Users can view their own projects" on projects;
drop policy if exists "Users can insert their own projects" on projects;
drop policy if exists "Users can update their own projects" on projects;
drop policy if exists "Users can delete their own projects" on projects;
drop policy if exists "Users can view own projects" on projects;
drop policy if exists "Users can create own projects" on projects;
drop policy if exists "Users can update own projects" on projects;
drop policy if exists "Users can delete own projects" on projects;
drop policy if exists "Users can view own archived projects" on projects;

-- Create a single comprehensive policy that handles all operations
create policy "Users can manage their own projects"
  on projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id); 