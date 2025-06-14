-- Create life goal tasks table
create table if not exists public.life_goal_tasks (
    id uuid default gen_random_uuid() primary key,
    goal_id uuid references life_goals(id) on delete cascade not null,
    task_id uuid references tasks(id) on delete cascade not null,
    time_worth float not null default 1,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(goal_id, task_id)
);

-- Enable RLS
alter table public.life_goal_tasks enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own life goal tasks" on life_goal_tasks;
drop policy if exists "Users can insert life goal tasks" on life_goal_tasks;
drop policy if exists "Users can update their own life goal tasks" on life_goal_tasks;
drop policy if exists "Users can delete their own life goal tasks" on life_goal_tasks;

-- Create policies for life goal tasks
create policy "Users can view their own life goal tasks"
    on life_goal_tasks for select
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_tasks.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can insert life goal tasks"
    on life_goal_tasks for insert
    with check (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_tasks.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can update their own life goal tasks"
    on life_goal_tasks for update
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_tasks.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

create policy "Users can delete their own life goal tasks"
    on life_goal_tasks for delete
    using (exists (
        select 1 from life_goal_areas
        join life_goal_subareas on life_goal_areas.id = life_goal_subareas.area_id
        join life_goals on life_goal_subareas.id = life_goals.subarea_id
        where life_goals.id = life_goal_tasks.goal_id
        and life_goal_areas.user_id = auth.uid()
    ));

-- Create updated_at trigger
drop trigger if exists update_life_goal_tasks_updated_at on life_goal_tasks;
create trigger update_life_goal_tasks_updated_at
    before update on life_goal_tasks
    for each row
    execute function update_updated_at_column();

-- Create indexes
drop index if exists life_goal_tasks_goal_id_idx;
drop index if exists life_goal_tasks_task_id_idx;
create index life_goal_tasks_goal_id_idx on life_goal_tasks(goal_id);
create index life_goal_tasks_task_id_idx on life_goal_tasks(task_id); 