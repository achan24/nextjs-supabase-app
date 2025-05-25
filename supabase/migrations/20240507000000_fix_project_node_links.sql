-- Drop existing constraints and policies
drop policy if exists "Users can manage their own project node links" on project_node_links;
drop policy if exists "Users can view linked process flows" on process_flows;

-- Temporarily disable RLS to modify data
alter table project_node_links disable row level security;

-- Create a temporary table with the correct structure
create table project_node_links_new (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  linked_flow_id uuid references process_flows(id) on delete cascade not null,
  linked_node_id text not null,
  created_at timestamp with time zone default now(),
  user_id uuid references auth.users(id) not null,
  description text,
  unique(project_id, linked_flow_id, linked_node_id)
);

-- Copy existing data, converting linked_node_id to text if needed
insert into project_node_links_new (
  id, project_id, linked_flow_id, linked_node_id, created_at, user_id, description
)
select 
  id, 
  project_id, 
  linked_flow_id, 
  linked_node_id, 
  created_at, 
  user_id, 
  description
from project_node_links;

-- Drop old table and rename new one
drop table project_node_links;
alter table project_node_links_new rename to project_node_links;

-- Re-enable RLS
alter table project_node_links enable row level security;

-- Recreate policies
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

-- Add indexes for better performance
create index project_node_links_project_id_idx on project_node_links(project_id);
create index project_node_links_flow_id_idx on project_node_links(linked_flow_id);
create index project_node_links_node_id_idx on project_node_links(linked_node_id); 