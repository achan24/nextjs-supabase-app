-- Add update policy for project_note_links
create policy "Users can update their own project note links"
  on project_note_links
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Drop and recreate the comprehensive policy to ensure it includes update
drop policy if exists "Users can manage their own project note links" on project_note_links;

create policy "Users can manage their own project note links"
  on project_note_links
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id); 