-- Create area points history table
create table if not exists area_points_history (
  id uuid default gen_random_uuid() primary key,
  area_id uuid references life_goal_areas(id) on delete cascade not null,
  points numeric not null,
  date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(area_id, date)
);

-- Create subarea points history table
create table if not exists subarea_points_history (
  id uuid default gen_random_uuid() primary key,
  subarea_id uuid references life_goal_subareas(id) on delete cascade not null,
  points numeric not null,
  date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(subarea_id, date)
);

-- Create goal points history table
create table if not exists goal_points_history (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references life_goals(id) on delete cascade not null,
  points numeric not null,
  date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(goal_id, date)
);

-- Enable RLS
alter table area_points_history enable row level security;
alter table subarea_points_history enable row level security;
alter table goal_points_history enable row level security;

-- Create policies for area points history
create policy "Users can view own area points history"
  on area_points_history for select
  using (exists (
    select 1 from life_goal_areas
    where id = area_points_history.area_id
    and user_id = auth.uid()
  ));

create policy "Users can insert own area points history"
  on area_points_history for insert
  with check (exists (
    select 1 from life_goal_areas
    where id = area_points_history.area_id
    and user_id = auth.uid()
  ));

-- Create policies for subarea points history
create policy "Users can view own subarea points history"
  on subarea_points_history for select
  using (exists (
    select 1 from life_goal_areas
    join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
    where life_goal_subareas.id = subarea_points_history.subarea_id
    and life_goal_areas.user_id = auth.uid()
  ));

create policy "Users can insert own subarea points history"
  on subarea_points_history for insert
  with check (exists (
    select 1 from life_goal_areas
    join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
    where life_goal_subareas.id = subarea_points_history.subarea_id
    and life_goal_areas.user_id = auth.uid()
  ));

-- Create policies for goal points history
create policy "Users can view own goal points history"
  on goal_points_history for select
  using (exists (
    select 1 from life_goal_areas
    join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
    join life_goals on life_goal_subareas.id = life_goals.subarea_id
    where life_goals.id = goal_points_history.goal_id
    and life_goal_areas.user_id = auth.uid()
  ));

create policy "Users can insert own goal points history"
  on goal_points_history for insert
  with check (exists (
    select 1 from life_goal_areas
    join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
    join life_goals on life_goal_subareas.id = life_goals.subarea_id
    where life_goals.id = goal_points_history.goal_id
    and life_goal_areas.user_id = auth.uid()
  ));

-- Create indexes
create index area_points_history_area_id_idx on area_points_history(area_id);
create index area_points_history_date_idx on area_points_history(date);
create index subarea_points_history_subarea_id_idx on subarea_points_history(subarea_id);
create index subarea_points_history_date_idx on subarea_points_history(date);
create index goal_points_history_goal_id_idx on goal_points_history(goal_id);
create index goal_points_history_date_idx on goal_points_history(date); 