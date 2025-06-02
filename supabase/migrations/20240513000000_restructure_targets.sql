-- Create targets table
create table if not exists targets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  target_value float not null,
  current_value float not null default 0,
  unit text not null,
  target_type text not null check (target_type in ('count', 'percentage', 'time', 'custom')),
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create goal_target_links table for linking targets to goals
create table if not exists goal_target_links (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references goals(id) on delete cascade not null,
  target_id uuid references targets(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  unique(goal_id, target_id)
);

-- Create target_tasks table
create table if not exists target_tasks (
  id uuid default gen_random_uuid() primary key,
  target_id uuid references targets(id) on delete cascade not null,
  task_id uuid references tasks(id) on delete cascade not null,
  contribution_value float not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(target_id, task_id)
);

-- Enable RLS
alter table targets enable row level security;
alter table goal_target_links enable row level security;
alter table target_tasks enable row level security;

-- RLS policies for targets
create policy "Users can view own targets"
  on targets for select
  using (auth.uid() = user_id);

create policy "Users can insert own targets"
  on targets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own targets"
  on targets for update
  using (auth.uid() = user_id);

create policy "Users can delete own targets"
  on targets for delete
  using (auth.uid() = user_id);

-- RLS policies for goal_target_links
create policy "Users can view own goal target links"
  on goal_target_links for select
  using (auth.uid() = user_id);

create policy "Users can insert own goal target links"
  on goal_target_links for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own goal target links"
  on goal_target_links for delete
  using (auth.uid() = user_id);

-- RLS policies for target_tasks
create policy "Users can view own target tasks"
  on target_tasks for select
  using (
    auth.uid() in (
      select user_id from targets where id = target_id
    )
  );

create policy "Users can insert own target tasks"
  on target_tasks for insert
  with check (
    auth.uid() in (
      select user_id from targets where id = target_id
    )
  );

create policy "Users can update own target tasks"
  on target_tasks for update
  using (
    auth.uid() in (
      select user_id from targets where id = target_id
    )
  );

create policy "Users can delete own target tasks"
  on target_tasks for delete
  using (
    auth.uid() in (
      select user_id from targets where id = target_id
    )
  );

-- Create trigger function for updating target progress
create or replace function update_target_on_task_status_change()
returns trigger as $$
begin
  -- If task is completed, add contribution value to target
  if NEW.status = 'completed' and OLD.status != 'completed' then
    update targets
    set current_value = current_value + tt.contribution_value
    from target_tasks tt
    where targets.id = tt.target_id
    and tt.task_id = NEW.id;
  -- If task is uncompleted, subtract contribution value from target
  elsif NEW.status != 'completed' and OLD.status = 'completed' then
    update targets
    set current_value = current_value - tt.contribution_value
    from target_tasks tt
    where targets.id = tt.target_id
    and tt.task_id = NEW.id;
  end if;
  return NEW;
end;
$$ language plpgsql;

-- Create trigger
drop trigger if exists update_goal_target_on_task_status_change on tasks;
create trigger update_target_on_task_status_change
  after update of status on tasks
  for each row
  execute function update_target_on_task_status_change();

-- Migrate data from old tables
insert into targets (
  title,
  description,
  target_value,
  current_value,
  unit,
  target_type,
  user_id
)
select 
  title,
  description,
  target_value,
  current_value,
  unit,
  target_type,
  (select user_id from goals where id = goal_id)
from goal_targets;

-- Create links for existing relationships
insert into goal_target_links (
  goal_id,
  target_id,
  user_id
)
select 
  gt.goal_id,
  t.id,
  (select user_id from goals where id = gt.goal_id)
from goal_targets gt
join targets t on t.title = gt.title;

-- Migrate task relationships
insert into target_tasks (
  target_id,
  task_id,
  contribution_value
)
select 
  t.id,
  gtt.task_id,
  gtt.contribution_value
from goal_target_tasks gtt
join goal_targets gt on gt.id = gtt.target_id
join targets t on t.title = gt.title;

-- Drop old tables
drop table if exists goal_target_tasks;
drop table if exists goal_targets; 