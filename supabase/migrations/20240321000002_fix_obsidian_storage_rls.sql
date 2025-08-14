-- Drop existing policies
drop policy if exists "Users can upload their own images to obsidian-notes" on storage.objects;
drop policy if exists "Users can view their own images in obsidian-notes" on storage.objects;
drop policy if exists "Users can update their own images in obsidian-notes" on storage.objects;
drop policy if exists "Users can delete their own images in obsidian-notes" on storage.objects;

-- Create new policies that match the actual path structure: note-images/{userId}/{noteId}/{filename}
create policy "Users can upload their own images to obsidian-notes"
  on storage.objects for insert
  with check (
    bucket_id = 'obsidian-notes' and
    auth.uid()::text = (storage.foldername(name))[2] -- userId is the second folder
  );

create policy "Users can view their own images in obsidian-notes"
  on storage.objects for select
  using (
    bucket_id = 'obsidian-notes' and
    auth.uid()::text = (storage.foldername(name))[2] -- userId is the second folder
  );

create policy "Users can update their own images in obsidian-notes"
  on storage.objects for update
  using (
    bucket_id = 'obsidian-notes' and
    auth.uid()::text = (storage.foldername(name))[2] -- userId is the second folder
  );

create policy "Users can delete their own images in obsidian-notes"
  on storage.objects for delete
  using (
    bucket_id = 'obsidian-notes' and
    auth.uid()::text = (storage.foldername(name))[2] -- userId is the second folder
  );
