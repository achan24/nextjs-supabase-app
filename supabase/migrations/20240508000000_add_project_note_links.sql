-- Create project_note_links table
create table if not exists project_note_links (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  note_id uuid references notes(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  user_id uuid references auth.users(id) not null,
  unique(project_id, note_id)
);

-- Enable RLS
alter table project_note_links enable row level security;

-- Create policies
create policy "Users can view their own project note links"
  on project_note_links for select
  using (auth.uid() = user_id);

create policy "Users can create their own project note links"
  on project_note_links for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own project note links"
  on project_note_links for delete
  using (auth.uid() = user_id);

-- Add indexes
create index project_note_links_project_id_idx on project_note_links(project_id);
create index project_note_links_note_id_idx on project_note_links(note_id);
create index project_note_links_user_id_idx on project_note_links(user_id); 