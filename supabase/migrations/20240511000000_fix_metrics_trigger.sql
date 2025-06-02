-- Drop the old trigger and function
drop trigger if exists update_goal_metrics_on_task_status_change on tasks;
drop function if exists update_goal_metrics_on_task_status_change();

-- Remove the old metrics column from goals table if it exists
alter table goals drop column if exists metrics; 