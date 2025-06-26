-- Create character_areas table
create table if not exists public.character_areas (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    description text,
    current_points numeric not null default 0,
    target_points numeric not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create character_subareas table
create table if not exists public.character_subareas (
    id uuid default gen_random_uuid() primary key,
    area_id uuid references character_areas(id) on delete cascade not null,
    name text not null,
    description text,
    current_points numeric not null default 0,
    target_points numeric not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create character_goals table
create table if not exists public.character_goals (
    id uuid default gen_random_uuid() primary key,
    subarea_id uuid references character_subareas(id) on delete cascade not null,
    name text not null,
    description text,
    current_points numeric not null default 0,
    target_points numeric not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create character_weekly_targets table to store weekly schedules
create table if not exists public.character_weekly_targets (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    target_id uuid not null, -- References either life_goal_areas.id, life_goal_subareas.id, or life_goals.id
    target_type text not null check (target_type in ('area', 'subarea', 'goal')),
    day_of_week integer not null check (day_of_week between 0 and 6), -- 0 = Monday, 6 = Sunday
    points numeric not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    -- Ensure each target has only one value per day
    unique(user_id, target_id, day_of_week)
);

-- Enable RLS
alter table public.character_areas enable row level security;
alter table public.character_subareas enable row level security;
alter table public.character_goals enable row level security;
alter table public.character_weekly_targets enable row level security;

-- Create policies for character_areas
create policy "Users can view own character areas"
    on public.character_areas for select
    using (auth.uid() = user_id);

create policy "Users can insert own character areas"
    on public.character_areas for insert
    with check (auth.uid() = user_id);

create policy "Users can update own character areas"
    on public.character_areas for update
    using (auth.uid() = user_id);

create policy "Users can delete own character areas"
    on public.character_areas for delete
    using (auth.uid() = user_id);

-- Create policies for character_subareas
create policy "Users can view own character subareas"
    on public.character_subareas for select
    using (exists (
        select 1 from character_areas
        where id = character_subareas.area_id
        and user_id = auth.uid()
    ));

create policy "Users can insert own character subareas"
    on public.character_subareas for insert
    with check (exists (
        select 1 from character_areas
        where id = character_subareas.area_id
        and user_id = auth.uid()
    ));

create policy "Users can update own character subareas"
    on public.character_subareas for update
    using (exists (
        select 1 from character_areas
        where id = character_subareas.area_id
        and user_id = auth.uid()
    ));

create policy "Users can delete own character subareas"
    on public.character_subareas for delete
    using (exists (
        select 1 from character_areas
        where id = character_subareas.area_id
        and user_id = auth.uid()
    ));

-- Create policies for character_goals
create policy "Users can view own character goals"
    on public.character_goals for select
    using (exists (
        select 1 from character_areas a
        join character_subareas s on s.area_id = a.id
        where s.id = character_goals.subarea_id
        and a.user_id = auth.uid()
    ));

create policy "Users can insert own character goals"
    on public.character_goals for insert
    with check (exists (
        select 1 from character_areas a
        join character_subareas s on s.area_id = a.id
        where s.id = character_goals.subarea_id
        and a.user_id = auth.uid()
    ));

create policy "Users can update own character goals"
    on public.character_goals for update
    using (exists (
        select 1 from character_areas a
        join character_subareas s on s.area_id = a.id
        where s.id = character_goals.subarea_id
        and a.user_id = auth.uid()
    ));

create policy "Users can delete own character goals"
    on public.character_goals for delete
    using (exists (
        select 1 from character_areas a
        join character_subareas s on s.area_id = a.id
        where s.id = character_goals.subarea_id
        and a.user_id = auth.uid()
    ));

-- Create policies for character_weekly_targets
create policy "Users can view own character weekly targets"
    on public.character_weekly_targets for select
    using (auth.uid() = user_id);

create policy "Users can insert own character weekly targets"
    on public.character_weekly_targets for insert
    with check (auth.uid() = user_id);

create policy "Users can update own character weekly targets"
    on public.character_weekly_targets for update
    using (auth.uid() = user_id);

create policy "Users can delete own character weekly targets"
    on public.character_weekly_targets for delete
    using (auth.uid() = user_id);

-- Add indexes for better performance
create index character_areas_user_id_idx on character_areas(user_id);
create index character_subareas_area_id_idx on character_subareas(area_id);
create index character_goals_subarea_id_idx on character_goals(subarea_id);
create index character_weekly_targets_user_id_idx on character_weekly_targets(user_id);
create index character_weekly_targets_target_lookup_idx on character_weekly_targets(user_id, target_id, day_of_week);

-- Create updated_at triggers
create trigger update_character_areas_updated_at
    before update on character_areas
    for each row
    execute function update_updated_at_column();

create trigger update_character_subareas_updated_at
    before update on character_subareas
    for each row
    execute function update_updated_at_column();

create trigger update_character_goals_updated_at
    before update on character_goals
    for each row
    execute function update_updated_at_column();

create trigger update_character_weekly_targets_updated_at
    before update on character_weekly_targets
    for each row
    execute function update_updated_at_column(); 