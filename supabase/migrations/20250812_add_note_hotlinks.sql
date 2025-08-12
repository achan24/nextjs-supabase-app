-- Create note_hotlinks table to manage Obsidian note hotlinks (separate from favorites)
create table if not exists public.note_hotlinks (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    note_id uuid references notes(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, note_id)
);

-- Enable RLS
alter table public.note_hotlinks enable row level security;

-- Policies
create policy "Users can manage their own note hotlinks"
    on note_hotlinks for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Indexes
create index if not exists note_hotlinks_user_id_idx on note_hotlinks(user_id);
create index if not exists note_hotlinks_note_id_idx on note_hotlinks(note_id);


