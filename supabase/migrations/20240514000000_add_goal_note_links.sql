-- Create area note links table
create table if not exists public.area_note_links (
  id uuid default gen_random_uuid() primary key,
  area_id uuid references life_goal_areas(id) on delete cascade not null,
  note_id uuid references notes(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  display_order integer default 0,
  created_at timestamp with time zone default now(),
  unique(area_id, note_id)
);

-- Create subarea note links table
create table if not exists public.subarea_note_links (
  id uuid default gen_random_uuid() primary key,
  subarea_id uuid references life_goal_subareas(id) on delete cascade not null,
  note_id uuid references notes(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  display_order integer default 0,
  created_at timestamp with time zone default now(),
  unique(subarea_id, note_id)
);

-- Create goal note links table
create table if not exists public.goal_note_links (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references life_goals(id) on delete cascade not null,
  note_id uuid references notes(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  display_order integer default 0,
  created_at timestamp with time zone default now(),
  unique(goal_id, note_id)
);

-- Enable RLS
alter table public.area_note_links enable row level security;
alter table public.subarea_note_links enable row level security;
alter table public.goal_note_links enable row level security;

-- Create policies for area note links
create policy "Users can view their own area note links"
  on public.area_note_links for select
  using (auth.uid() = user_id);

create policy "Users can create their own area note links"
  on public.area_note_links for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own area note links"
  on public.area_note_links for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own area note links"
  on public.area_note_links for delete
  using (auth.uid() = user_id);

-- Create policies for subarea note links
create policy "Users can view their own subarea note links"
  on public.subarea_note_links for select
  using (auth.uid() = user_id);

create policy "Users can create their own subarea note links"
  on public.subarea_note_links for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own subarea note links"
  on public.subarea_note_links for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own subarea note links"
  on public.subarea_note_links for delete
  using (auth.uid() = user_id);

-- Create policies for goal note links
create policy "Users can view their own goal note links"
  on public.goal_note_links for select
  using (auth.uid() = user_id);

create policy "Users can create their own goal note links"
  on public.goal_note_links for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own goal note links"
  on public.goal_note_links for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own goal note links"
  on public.goal_note_links for delete
  using (auth.uid() = user_id);

-- Add indexes
create index area_note_links_area_id_idx on area_note_links(area_id);
create index area_note_links_note_id_idx on area_note_links(note_id);
create index area_note_links_user_id_idx on area_note_links(user_id);
create index area_note_links_display_order_idx on area_note_links(display_order);

create index subarea_note_links_subarea_id_idx on subarea_note_links(subarea_id);
create index subarea_note_links_note_id_idx on subarea_note_links(note_id);
create index subarea_note_links_user_id_idx on subarea_note_links(user_id);
create index subarea_note_links_display_order_idx on subarea_note_links(display_order);

create index goal_note_links_goal_id_idx on goal_note_links(goal_id);
create index goal_note_links_note_id_idx on goal_note_links(note_id);
create index goal_note_links_user_id_idx on goal_note_links(user_id);
create index goal_note_links_display_order_idx on goal_note_links(display_order); 