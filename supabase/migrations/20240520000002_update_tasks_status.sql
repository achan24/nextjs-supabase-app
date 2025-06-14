-- Update tasks table status field to use the correct enum values
alter table tasks 
    drop constraint if exists tasks_status_check;

alter table tasks
    add constraint tasks_status_check 
    check (status in ('todo', 'in_progress', 'completed'));

-- Update any existing 'pending' status to 'todo'
update tasks 
set status = 'todo' 
where status = 'pending'; 