-- Create project notes table
create table if not exists project_notes (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table project_notes enable row level security;

-- Create policies
create policy "Users can view their own project notes"
  on project_notes for select
  using (auth.uid() = user_id);

create policy "Users can create their own project notes"
  on project_notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own project notes"
  on project_notes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own project notes"
  on project_notes for delete
  using (auth.uid() = user_id);

-- Add indexes
create index project_notes_project_id_idx on project_notes(project_id);
create index project_notes_user_id_idx on project_notes(user_id);
create index project_notes_created_at_idx on project_notes(created_at);

-- Add updated_at trigger
create trigger handle_project_notes_updated_at
  before update on project_notes
  for each row
  execute function public.handle_updated_at(); 