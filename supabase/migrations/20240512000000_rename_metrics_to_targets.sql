-- Rename tables
alter table if exists goal_metrics rename to goal_targets;
alter table if exists goal_metric_tasks rename to goal_target_tasks;

-- Update foreign key references
alter table goal_target_tasks rename column metric_id to target_id;

-- Rename columns
alter table goal_targets rename column metric_type to target_type;

-- Update trigger function
create or replace function update_goal_target_on_task_status_change()
returns trigger as $$
begin
  -- If task is completed, add contribution value to target
  if NEW.status = 'completed' and OLD.status != 'completed' then
    update goal_targets
    set current_value = current_value + gtt.contribution_value
    from goal_target_tasks gtt
    where goal_targets.id = gtt.target_id
    and gtt.task_id = NEW.id;
  -- If task is uncompleted, subtract contribution value from target
  elsif NEW.status != 'completed' and OLD.status = 'completed' then
    update goal_targets
    set current_value = current_value - gtt.contribution_value
    from goal_target_tasks gtt
    where goal_targets.id = gtt.target_id
    and gtt.task_id = NEW.id;
  end if;
  return NEW;
end;
$$ language plpgsql;

-- Drop old trigger and create new one
drop trigger if exists update_goal_metric_on_task_status_change on tasks;
create trigger update_goal_target_on_task_status_change
  after update of status on tasks
  for each row
  execute function update_goal_target_on_task_status_change();

-- Update RLS policies
alter policy "Users can view own goal metrics" on goal_targets rename to "Users can view own goal targets";
alter policy "Users can insert own goal metrics" on goal_targets rename to "Users can insert own goal targets";
alter policy "Users can update own goal metrics" on goal_targets rename to "Users can update own goal targets";
alter policy "Users can delete own goal metrics" on goal_targets rename to "Users can delete own goal targets";

alter policy "Users can view own goal metric tasks" on goal_target_tasks rename to "Users can view own goal target tasks";
alter policy "Users can insert own goal metric tasks" on goal_target_tasks rename to "Users can insert own goal target tasks";
alter policy "Users can update own goal metric tasks" on goal_target_tasks rename to "Users can update own goal target tasks";
alter policy "Users can delete own goal metric tasks" on goal_target_tasks rename to "Users can delete own goal target tasks"; 