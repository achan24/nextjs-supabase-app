-- Create sequence_completions table
create table if not exists public.sequence_completions (
    id uuid default gen_random_uuid() primary key,
    sequence_id uuid references timer_sequences(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
    total_time integer not null, -- Total time in milliseconds
    task_times jsonb not null default '[]'::jsonb, -- Array of {taskId: string, timeSpent: number} objects
    notes text
);

-- Enable RLS
alter table public.sequence_completions enable row level security;

-- Create policies
create policy "Users can create their own sequence completions"
    on sequence_completions for insert
    with check (auth.uid() = user_id);

create policy "Users can view their own sequence completions"
    on sequence_completions for select
    using (auth.uid() = user_id);

create policy "Users can update their own sequence completions"
    on sequence_completions for update
    using (auth.uid() = user_id);

create policy "Users can delete their own sequence completions"
    on sequence_completions for delete
    using (auth.uid() = user_id);

-- Create indexes
create index sequence_completions_sequence_id_idx on sequence_completions(sequence_id);
create index sequence_completions_user_id_idx on sequence_completions(user_id);
create index sequence_completions_completed_at_idx on sequence_completions(completed_at); 