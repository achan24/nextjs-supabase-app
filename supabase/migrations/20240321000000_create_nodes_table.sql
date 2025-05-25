-- Create nodes table for process flow maps
create table if not exists nodes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  type text not null,
  position jsonb,
  data jsonb,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add RLS policies
alter table nodes enable row level security;

create policy "Users can manage their own nodes"
  on nodes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add updated_at trigger
create trigger set_updated_at
  before update on nodes
  for each row
  execute function public.set_updated_at(); 