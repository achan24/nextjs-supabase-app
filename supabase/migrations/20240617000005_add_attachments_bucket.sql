-- Create a new storage bucket for attachments with CORS configuration
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false, -- private bucket
  104857600, -- 100MB limit
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
set 
  public = false,
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

-- Set CORS and security headers
insert into storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version)
values (gen_random_uuid(), 'attachments', '.cors', null, now(), now(), now(), jsonb_build_object(
  'cors_rules', jsonb_build_array(
    jsonb_build_object(
      'allowed_origins', array['*'],
      'allowed_methods', array['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
      'allowed_headers', array['*'],
      'exposed_headers', array['Content-Range', 'Range', 'Content-Length', 'Content-Type'],
      'max_age_seconds', 3600
    )
  ),
  'security_headers', jsonb_build_object(
    'Access-Control-Allow-Origin', '*',
    'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
    'Access-Control-Allow-Headers', '*',
    'Access-Control-Expose-Headers', 'Content-Range, Range, Content-Length, Content-Type',
    'Cross-Origin-Resource-Policy', 'cross-origin',
    'Cross-Origin-Opener-Policy', 'same-origin-allow-popups',
    'Cross-Origin-Embedder-Policy', 'unsafe-none'
  )
), '1')
on conflict (bucket_id, name) do update
set metadata = excluded.metadata,
    updated_at = now();

-- Drop existing policies if they exist
drop policy if exists "Allow authenticated users to upload attachments" on storage.objects;
drop policy if exists "Allow authenticated users to update their own attachments" on storage.objects;
drop policy if exists "Allow authenticated users to read attachments" on storage.objects;
drop policy if exists "Allow authenticated users to delete their own attachments" on storage.objects;

-- Policy to allow authenticated users to upload attachments
create policy "Allow authenticated users to upload attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'attachments'
);

-- Policy to allow authenticated users to update their own attachments
create policy "Allow authenticated users to update their own attachments"
on storage.objects for update to authenticated
using (
  bucket_id = 'attachments'
);

-- Policy to allow authenticated users to read attachments
create policy "Allow authenticated users to read attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'attachments'
);

-- Policy to allow authenticated users to delete their own attachments
create policy "Allow authenticated users to delete their own attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'attachments'
); 