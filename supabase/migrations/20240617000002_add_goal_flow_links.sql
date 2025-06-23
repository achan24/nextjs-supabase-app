-- Create goal_flow_links table
create table if not exists public.goal_flow_links (
    id uuid default gen_random_uuid() primary key,
    goal_id uuid references life_goals(id) on delete cascade not null,
    flow_id uuid references process_flows(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    unique(goal_id, flow_id)
);

-- Enable RLS
alter table public.goal_flow_links enable row level security;

-- Create policies
create policy "Users can manage their own goal flow links"
    on goal_flow_links for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Add indexes for better performance
create index goal_flow_links_goal_id_idx on goal_flow_links(goal_id);
create index goal_flow_links_flow_id_idx on goal_flow_links(flow_id);

-- Add policy to allow users to view linked process flows through goals
create policy "Users can view process flows linked to their goals"
    on process_flows for select
    using (
        id in (
            select flow_id 
            from goal_flow_links 
            where user_id = auth.uid()
        )
    ); 