-- Create a new storage bucket for obsidian note images with CORS configuration
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'obsidian-notes',
  'obsidian-notes',
  false, -- private bucket
  52428800, -- 50MB limit
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set 
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];

-- Set CORS and security headers
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types, owner, owner_id)
values (
  'obsidian-notes',
  'obsidian-notes',
  false,
  52428800,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
  null,
  null
)
on conflict (id) do update
set 
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
  owner = null,
  owner_id = null;

-- Update bucket security settings
insert into storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version)
values (gen_random_uuid(), 'obsidian-notes', '.cors', null, now(), now(), now(), jsonb_build_object(
  'cacheControl', '3600',
  'mimetype', 'text/plain',
  'size', 0
), 1)
on conflict (bucket_id, name) do update
set 
  metadata = jsonb_build_object(
    'cacheControl', '3600',
    'mimetype', 'text/plain',
    'size', 0
  ),
  updated_at = now();

-- Set up RLS policies for obsidian-notes bucket
create policy "Users can upload their own images to obsidian-notes"
  on storage.objects for insert
  with check (
    bucket_id = 'obsidian-notes' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view their own images in obsidian-notes"
  on storage.objects for select
  using (
    bucket_id = 'obsidian-notes' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own images in obsidian-notes"
  on storage.objects for update
  using (
    bucket_id = 'obsidian-notes' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own images in obsidian-notes"
  on storage.objects for delete
  using (
    bucket_id = 'obsidian-notes' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
