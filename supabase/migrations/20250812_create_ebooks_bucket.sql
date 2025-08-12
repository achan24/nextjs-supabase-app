-- Create a private storage bucket for ebooks (PDF/EPUB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ebooks',
  'ebooks',
  false, -- private bucket
  524288000, -- 500MB limit
  array[
    'application/pdf',
    'application/epub+zip'
  ]
)
on conflict (id) do update
set 
  public = false,
  file_size_limit = 524288000,
  allowed_mime_types = array['application/pdf','application/epub+zip'];

-- Add CORS/security control object
insert into storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version)
values (gen_random_uuid(), 'ebooks', '.cors', null, now(), now(), now(), jsonb_build_object(
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

-- Policies: authenticated users can read/upload/update/delete within the ebooks bucket
-- Drop if exist
drop policy if exists "ebooks_insert" on storage.objects;
drop policy if exists "ebooks_update" on storage.objects;
drop policy if exists "ebooks_select" on storage.objects;
drop policy if exists "ebooks_delete" on storage.objects;

create policy "ebooks_insert"
on storage.objects for insert to authenticated
with check ( bucket_id = 'ebooks' );

create policy "ebooks_update"
on storage.objects for update to authenticated
using ( bucket_id = 'ebooks' );

create policy "ebooks_select"
on storage.objects for select to authenticated
using ( bucket_id = 'ebooks' );

create policy "ebooks_delete"
on storage.objects for delete to authenticated
using ( bucket_id = 'ebooks' );
