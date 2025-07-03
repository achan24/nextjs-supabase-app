-- Update the attachments bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types, owner, created_at, updated_at, avif_autodetection)
values ('attachments', 'attachments', true, 104857600, null, null, now(), now(), false)
on conflict (id) do update
set public = true;

-- Set CORS policy for the attachments bucket
insert into storage.objects (
  bucket_id,
  name,
  owner,
  created_at,
  updated_at,
  last_accessed_at,
  metadata,
  path_tokens
)
values (
  'attachments',
  '.cors',
  null,
  now(),
  now(),
  now(),
  jsonb_build_object(
    'version', 1,
    'cors', jsonb_build_object(
      'allowedOrigins', array['*'],
      'allowedMethods', array['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
      'allowedHeaders', array['*'],
      'exposedHeaders', array['Content-Range', 'Range', 'Content-Length'],
      'maxAgeSeconds', 600
    )
  ),
  array['.cors']
)
on conflict (bucket_id, name) do update
set metadata = excluded.metadata,
    updated_at = now();

-- Also update the process-flow bucket CORS if it exists
insert into storage.objects (
  bucket_id,
  name,
  owner,
  created_at,
  updated_at,
  last_accessed_at,
  metadata,
  path_tokens
)
values (
  'process-flow',
  '.cors',
  null,
  now(),
  now(),
  now(),
  jsonb_build_object(
    'version', 1,
    'cors', jsonb_build_object(
      'allowedOrigins', array['*'],
      'allowedMethods', array['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
      'allowedHeaders', array['*'],
      'exposedHeaders', array['Content-Range', 'Range', 'Content-Length'],
      'maxAgeSeconds', 600
    )
  ),
  array['.cors']
)
on conflict (bucket_id, name) do update
set metadata = excluded.metadata,
    updated_at = now(); 