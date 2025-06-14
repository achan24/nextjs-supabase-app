-- Enable RLS on tasks table
alter table public.tasks enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own tasks" on tasks;
drop policy if exists "Users can create tasks" on tasks;
drop policy if exists "Users can update their own tasks" on tasks;
drop policy if exists "Users can delete their own tasks" on tasks;

-- Create policies for tasks
create policy "Users can view their own tasks"
    on tasks for select
    using (
        auth.uid() = user_id
        or exists (
            select 1 from life_goal_tasks
            join life_goals on life_goals.id = life_goal_tasks.goal_id
            join life_goal_subareas on life_goal_subareas.id = life_goals.subarea_id
            join life_goal_areas on life_goal_areas.id = life_goal_subareas.area_id
            where life_goal_tasks.task_id = tasks.id
            and life_goal_areas.user_id = auth.uid()
        )
    );

create policy "Users can create tasks"
    on tasks for insert
    with check (true);  -- Allow task creation, ownership will be set via trigger

create policy "Users can update their own tasks"
    on tasks for update
    using (auth.uid() = user_id);

create policy "Users can delete their own tasks"
    on tasks for delete
    using (auth.uid() = user_id);

-- Add user_id column if it doesn't exist
alter table public.tasks 
    add column if not exists user_id uuid references auth.users(id) default auth.uid();

-- Create trigger to set user_id on insert
create or replace function public.set_task_user_id()
returns trigger as $$
begin
    new.user_id := auth.uid();
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists set_task_user_id_trigger on tasks;
create trigger set_task_user_id_trigger
    before insert on tasks
    for each row
    execute function set_task_user_id(); 