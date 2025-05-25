-- Drop existing policies and table
drop policy if exists "Users can manage their own project node links" on project_node_links;
drop policy if exists "Users can view linked process flows" on process_flows;
drop table if exists project_node_links;

-- Create project_node_links table
create table project_node_links (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  linked_flow_id uuid references process_flows(id) on delete cascade,
  linked_node_id text not null,
  created_at timestamp with time zone default now(),
  user_id uuid references auth.users(id),
  description text,
  unique(project_id, linked_flow_id, linked_node_id)
);

-- Add RLS policies
alter table project_node_links enable row level security;

-- Create new policies
create policy "Users can manage their own project node links"
  on project_node_links
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add policy to allow users to view linked process flows
create policy "Users can view linked process flows"
  on process_flows for select
  using (
    id in (
      select linked_flow_id 
      from project_node_links 
      where user_id = auth.uid()
    )
  ); 