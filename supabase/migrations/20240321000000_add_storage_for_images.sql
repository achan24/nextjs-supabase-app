-- Create a new storage bucket for process flow images with CORS configuration
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'process-flow',
  'process-flow',
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
  'process-flow',
  'process-flow',
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
values (gen_random_uuid(), 'process-flow', '.cors', null, now(), now(), now(), jsonb_build_object(
  'cors_rules', jsonb_build_array(
    jsonb_build_object(
      'allowed_origins', array['*'],
      'allowed_methods', array['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
      'allowed_headers', array['*'],
      'exposed_headers', array['Content-Range', 'Range', 'Content-Length'],
      'max_age_seconds', 3600
    )
  ),
  'security_headers', jsonb_build_object(
    'Access-Control-Allow-Origin', '*',
    'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
    'Access-Control-Allow-Headers', '*',
    'Access-Control-Expose-Headers', 'Content-Range, Range, Content-Length',
    'Cross-Origin-Resource-Policy', 'cross-origin',
    'Cross-Origin-Opener-Policy', 'same-origin',
    'Cross-Origin-Embedder-Policy', 'require-corp'
  )
), '1')
on conflict (bucket_id, name) do update
set metadata = excluded.metadata,
    updated_at = now();

-- Drop existing policies
drop policy if exists "Allow authenticated users to upload images" on storage.objects;
drop policy if exists "Allow authenticated users to update their own images" on storage.objects;
drop policy if exists "Allow authenticated users to read images" on storage.objects;
drop policy if exists "Allow public read access to images" on storage.objects;
drop policy if exists "Allow authenticated users to delete their own images" on storage.objects;

-- Policy to allow authenticated users to upload images
create policy "Allow authenticated users to upload images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'process-flow' and
  (storage.foldername(name))[1] = 'node-images'
);

-- Policy to allow authenticated users to update their own images
create policy "Allow authenticated users to update their own images"
on storage.objects for update to authenticated
using (
  bucket_id = 'process-flow' and
  (storage.foldername(name))[1] = 'node-images'
);

-- Policy to allow only authenticated users to read images
create policy "Allow authenticated users to read images"
on storage.objects for select to authenticated
using (
  bucket_id = 'process-flow' and
  (storage.foldername(name))[1] = 'node-images'
);

-- Policy to allow authenticated users to delete their own images
create policy "Allow authenticated users to delete their own images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'process-flow' and
  (storage.foldername(name))[1] = 'node-images'
); 