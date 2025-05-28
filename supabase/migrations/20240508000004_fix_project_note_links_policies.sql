-- Drop all existing policies
drop policy if exists "Users can view their own project note links" on project_note_links;
drop policy if exists "Users can create their own project note links" on project_note_links;
drop policy if exists "Users can delete their own project note links" on project_note_links;
drop policy if exists "Users can update their own project note links" on project_note_links;
drop policy if exists "Users can update display order of their own project note links" on project_note_links;
drop policy if exists "Users can manage their own project note links" on project_note_links;

-- Create a single comprehensive policy that handles all operations
create policy "Users can manage their own project note links"
  on project_note_links
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id); 