-- Create notes table
create table if not exists public.notes (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    content text not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.notes enable row level security;

-- Create policies
create policy "Users can create their own notes" on notes for
    insert with check (auth.uid() = user_id);

create policy "Users can view their own notes" on notes for
    select using (auth.uid() = user_id);

create policy "Users can update their own notes" on notes for
    update using (auth.uid() = user_id);

create policy "Users can delete their own notes" on notes for
    delete using (auth.uid() = user_id);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger handle_notes_updated_at
    before update on public.notes
    for each row
    execute function public.handle_updated_at(); 