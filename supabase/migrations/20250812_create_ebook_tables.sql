-- Ebooks core tables
create table if not exists public.ebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  title text,
  created_at timestamptz not null default now(),
  unique(user_id, storage_path)
);

create table if not exists public.ebook_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ebook_id uuid not null references public.ebooks(id) on delete cascade,
  page int not null check (page > 0),
  label text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ebook_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ebook_id uuid not null references public.ebooks(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique(ebook_id, user_id)
);

alter table public.ebooks enable row level security;
alter table public.ebook_bookmarks enable row level security;
alter table public.ebook_notes enable row level security;

-- Policies: user can CRUD own rows
-- ebooks
drop policy if exists "ebooks_select_own" on public.ebooks;
create policy "ebooks_select_own" on public.ebooks for select to authenticated using (user_id = auth.uid());

drop policy if exists "ebooks_insert_own" on public.ebooks;
create policy "ebooks_insert_own" on public.ebooks for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "ebooks_update_own" on public.ebooks;
create policy "ebooks_update_own" on public.ebooks for update to authenticated using (user_id = auth.uid());

drop policy if exists "ebooks_delete_own" on public.ebooks;
create policy "ebooks_delete_own" on public.ebooks for delete to authenticated using (user_id = auth.uid());

-- ebook_bookmarks
drop policy if exists "ebook_bookmarks_select_own" on public.ebook_bookmarks;
create policy "ebook_bookmarks_select_own" on public.ebook_bookmarks for select to authenticated using (user_id = auth.uid());

drop policy if exists "ebook_bookmarks_insert_own" on public.ebook_bookmarks;
create policy "ebook_bookmarks_insert_own" on public.ebook_bookmarks for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "ebook_bookmarks_update_own" on public.ebook_bookmarks;
create policy "ebook_bookmarks_update_own" on public.ebook_bookmarks for update to authenticated using (user_id = auth.uid());

drop policy if exists "ebook_bookmarks_delete_own" on public.ebook_bookmarks;
create policy "ebook_bookmarks_delete_own" on public.ebook_bookmarks for delete to authenticated using (user_id = auth.uid());

-- ebook_notes
drop policy if exists "ebook_notes_select_own" on public.ebook_notes;
create policy "ebook_notes_select_own" on public.ebook_notes for select to authenticated using (user_id = auth.uid());

drop policy if exists "ebook_notes_insert_own" on public.ebook_notes;
create policy "ebook_notes_insert_own" on public.ebook_notes for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "ebook_notes_update_own" on public.ebook_notes;
create policy "ebook_notes_update_own" on public.ebook_notes for update to authenticated using (user_id = auth.uid());

drop policy if exists "ebook_notes_delete_own" on public.ebook_notes;
create policy "ebook_notes_delete_own" on public.ebook_notes for delete to authenticated using (user_id = auth.uid());
