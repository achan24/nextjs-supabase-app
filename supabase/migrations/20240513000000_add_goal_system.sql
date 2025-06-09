-- Create areas table
create table if not exists public.life_goal_areas (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create subareas table
create table if not exists public.life_goal_subareas (
    id uuid default gen_random_uuid() primary key,
    area_id uuid references life_goal_areas(id) on delete cascade not null,
    name text not null,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create life goals table
create table if not exists public.life_goals (
    id uuid default gen_random_uuid() primary key,
    subarea_id uuid references life_goal_subareas(id) on delete cascade not null,
    title text not null,
    description text,
    status text not null default 'active',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create milestones table
create table if not exists public.life_goal_milestones (
    id uuid default gen_random_uuid() primary key,
    goal_id uuid references life_goals(id) on delete cascade not null,
    title text not null,
    description text,
    completed boolean not null default false,
    completed_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create metrics table
create table if not exists public.life_goal_metrics (
    id uuid default gen_random_uuid() primary key,
    goal_id uuid references life_goals(id) on delete cascade not null,
    name text not null,
    type text not null check (type in ('time', 'count', 'streak', 'custom')),
    current_value numeric not null default 0,
    unit text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create metric thresholds table
create table if not exists public.life_goal_metric_thresholds (
    id uuid default gen_random_uuid() primary key,
    metric_id uuid references life_goal_metrics(id) on delete cascade not null,
    milestone_id uuid references life_goal_milestones(id) on delete cascade not null,
    target_value numeric not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create sequence contributions table
create table if not exists public.life_goal_sequence_contributions (
    id uuid default gen_random_uuid() primary key,
    sequence_id uuid references timer_sequences(id) on delete cascade not null,
    metric_id uuid references life_goal_metrics(id) on delete cascade not null,
    contribution_value numeric not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.life_goal_areas enable row level security;
alter table public.life_goal_subareas enable row level security;
alter table public.life_goals enable row level security;
alter table public.life_goal_milestones enable row level security;
alter table public.life_goal_metrics enable row level security;
alter table public.life_goal_metric_thresholds enable row level security;
alter table public.life_goal_sequence_contributions enable row level security;

-- Create policies
create policy "Users can view their own areas"
    on life_goal_areas for select
    using (auth.uid() = user_id);

create policy "Users can insert their own areas"
    on life_goal_areas for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own areas"
    on life_goal_areas for update
    using (auth.uid() = user_id);

create policy "Users can delete their own areas"
    on life_goal_areas for delete
    using (auth.uid() = user_id);

-- Create policies for subareas (through area ownership)
create policy "Users can view their own subareas"
    on life_goal_subareas for select
    using (exists (
        select 1 from life_goal_areas
        where life_goal_areas.id = life_goal_subareas.area_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can insert subareas in their areas"
    on life_goal_subareas for insert
    with check (exists (
        select 1 from life_goal_areas
        where life_goal_areas.id = life_goal_subareas.area_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can update their own subareas"
    on life_goal_subareas for update
    using (exists (
        select 1 from life_goal_areas
        where life_goal_areas.id = life_goal_subareas.area_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can delete their own subareas"
    on life_goal_subareas for delete
    using (exists (
        select 1 from life_goal_areas
        where life_goal_areas.id = life_goal_subareas.area_id
        and life_goal_areas.user_id = auth.uid()
    ));

-- Create policies for goals (through subarea ownership)
create policy "Users can view their own life goals"
    on life_goals for select
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        where life_goal_subareas.id = life_goals.subarea_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can insert goals in their subareas"
    on life_goals for insert
    with check (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        where life_goal_subareas.id = life_goals.subarea_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can update their own life goals"
    on life_goals for update
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        where life_goal_subareas.id = life_goals.subarea_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can delete their own life goals"
    on life_goals for delete
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        where life_goal_subareas.id = life_goals.subarea_id
        and life_goal_areas.user_id = auth.uid()
    ));

-- Create similar cascading policies for milestones, metrics, thresholds, and contributions
create policy "Users can view their own milestones"
    on life_goal_milestones for select
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_milestones.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can insert their own milestones"
    on life_goal_milestones for insert
    with check (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_milestones.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can update their own milestones"
    on life_goal_milestones for update
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_milestones.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can delete their own milestones"
    on life_goal_milestones for delete
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_milestones.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

-- Create indexes
create index life_goal_areas_user_id_idx on life_goal_areas(user_id);
create index life_goal_subareas_area_id_idx on life_goal_subareas(area_id);
create index life_goals_subarea_id_idx on life_goals(subarea_id);
create index life_goal_milestones_goal_id_idx on life_goal_milestones(goal_id);
create index life_goal_metrics_goal_id_idx on life_goal_metrics(goal_id);
create index life_goal_metric_thresholds_metric_id_idx on life_goal_metric_thresholds(metric_id);
create index life_goal_metric_thresholds_milestone_id_idx on life_goal_metric_thresholds(milestone_id);
create index life_goal_sequence_contributions_sequence_id_idx on life_goal_sequence_contributions(sequence_id);
create index life_goal_sequence_contributions_metric_id_idx on life_goal_sequence_contributions(metric_id);

-- Create updated_at triggers
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger update_life_goal_areas_updated_at
    before update on life_goal_areas
    for each row
    execute function update_updated_at_column();

create trigger update_life_goal_subareas_updated_at
    before update on life_goal_subareas
    for each row
    execute function update_updated_at_column();

create trigger update_life_goals_updated_at
    before update on life_goals
    for each row
    execute function update_updated_at_column();

create trigger update_life_goal_milestones_updated_at
    before update on life_goal_milestones
    for each row
    execute function update_updated_at_column();

create trigger update_life_goal_metrics_updated_at
    before update on life_goal_metrics
    for each row
    execute function update_updated_at_column(); 