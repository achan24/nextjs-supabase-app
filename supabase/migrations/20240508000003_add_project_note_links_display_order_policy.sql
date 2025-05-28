-- Add specific update policy for display_order in project_note_links
create policy "Users can update display order of their own project note links"
  on project_note_links
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id); 