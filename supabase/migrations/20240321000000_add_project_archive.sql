-- Add archived column to projects table
alter table projects 
add column archived boolean default false,
add column archived_at timestamp with time zone;

-- Add index for faster filtering
create index projects_archived_idx on projects(archived);

-- Update RLS policies to include archived status
create policy "Users can view own archived projects"
  on projects for select
  using (auth.uid() = user_id); 