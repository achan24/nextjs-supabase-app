-- Create process_flows table
create table if not exists public.process_flows (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    nodes jsonb not null default '[]'::jsonb,
    edges jsonb not null default '[]'::jsonb,
    user_id uuid references auth.users(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.process_flows enable row level security;

-- Create policies
create policy "Users can create their own process flows"
    on process_flows for insert
    with check (auth.uid() = user_id);

create policy "Users can view their own process flows"
    on process_flows for select
    using (auth.uid() = user_id);

create policy "Users can update their own process flows"
    on process_flows for update
    using (auth.uid() = user_id);

create policy "Users can delete their own process flows"
    on process_flows for delete
    using (auth.uid() = user_id);

-- Create updated_at trigger
create trigger handle_process_flows_updated_at
    before update on public.process_flows
    for each row
    execute function public.handle_updated_at(); 