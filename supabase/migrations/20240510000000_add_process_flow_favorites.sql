-- Create process_flow_favorites table
create table if not exists public.process_flow_favorites (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    flow_id uuid references process_flows(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, flow_id)
);

-- Enable RLS
alter table public.process_flow_favorites enable row level security;

-- Create policies
create policy "Users can manage their own process flow favorites"
    on process_flow_favorites for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Add indexes for better performance
create index process_flow_favorites_user_id_idx on process_flow_favorites(user_id);
create index process_flow_favorites_flow_id_idx on process_flow_favorites(flow_id); 