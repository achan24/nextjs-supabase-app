-- Create overview_targets table for storing which targets are shown in overview
create table if not exists overview_targets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  target_id uuid references targets(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(user_id, target_id)
);

-- Enable RLS
alter table overview_targets enable row level security;

-- Create policies
create policy "Users can view own overview targets"
  on overview_targets for select
  using (auth.uid() = user_id);

create policy "Users can insert own overview targets"
  on overview_targets for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own overview targets"
  on overview_targets for delete
  using (auth.uid() = user_id);

-- Add indexes
create index overview_targets_user_id_idx on overview_targets(user_id);
create index overview_targets_target_id_idx on overview_targets(target_id); 