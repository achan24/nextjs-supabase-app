-- Create timer_sequences table
create table if not exists public.timer_sequences (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    tasks jsonb not null default '[]'::jsonb,
    user_id uuid references auth.users(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.timer_sequences enable row level security;

-- Create policies
create policy "Users can create their own timer sequences"
    on timer_sequences for insert
    with check (auth.uid() = user_id);

create policy "Users can view their own timer sequences"
    on timer_sequences for select
    using (auth.uid() = user_id);

create policy "Users can update their own timer sequences"
    on timer_sequences for update
    using (auth.uid() = user_id);

create policy "Users can delete their own timer sequences"
    on timer_sequences for delete
    using (auth.uid() = user_id);

-- Create updated_at trigger
create trigger handle_timer_sequences_updated_at
    before update on public.timer_sequences
    for each row
    execute function public.handle_updated_at(); 