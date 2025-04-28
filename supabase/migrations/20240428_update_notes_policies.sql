-- Drop existing policies if they exist
drop policy if exists "Users can create their own notes" on notes;
drop policy if exists "Users can view their own notes" on notes;
drop policy if exists "Users can update their own notes" on notes;
drop policy if exists "Users can delete their own notes" on notes;

-- Enable RLS
alter table notes enable row level security;

-- Create a single comprehensive policy for all operations
create policy "Users can manage their own notes"
  on notes
  for all
  using ( user_id = auth.uid() )
  with check ( user_id = auth.uid() ); 