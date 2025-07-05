-- Create the character table if it doesn't exist
create table if not exists characters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  level integer not null default 1,
  xp integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

-- Enable RLS
alter table characters enable row level security;

-- Policies
create policy "Users can view their own character"
  on characters for select
  using (auth.uid() = user_id);

create policy "Users can update their own character"
  on characters for update
  using (auth.uid() = user_id);

-- Reset any existing character data to level 1 with 0 XP
update characters
set level = 1,
    xp = 0;

-- Create trigger for updated_at
create trigger handle_updated_at before update on characters
  for each row execute procedure moddatetime (updated_at);

-- Create character traits table
create table if not exists public.character_traits (
    id uuid default gen_random_uuid() primary key,
    character_id uuid references characters(id) on delete cascade not null,
    name text not null,
    value integer not null check (value between 0 and 100),
    last_updated timestamp with time zone default timezone('utc'::text, now()) not null,
    calculation_data jsonb default '{}'::jsonb not null
);

-- Create trait history table
create table if not exists public.trait_history (
    id uuid default gen_random_uuid() primary key,
    trait_id uuid references character_traits(id) on delete cascade not null,
    old_value integer not null check (old_value between 0 and 100),
    new_value integer not null check (new_value between 0 and 100),
    change_reason text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.character_traits enable row level security;
alter table public.trait_history enable row level security;

-- Create policies for character traits
create policy "Users can view own character traits"
    on public.character_traits for select
    using (exists (
        select 1 from characters
        where id = character_traits.character_id
        and user_id = auth.uid()
    ));

create policy "Users can insert own character traits"
    on public.character_traits for insert
    with check (exists (
        select 1 from characters
        where id = character_traits.character_id
        and user_id = auth.uid()
    ));

create policy "Users can update own character traits"
    on public.character_traits for update
    using (exists (
        select 1 from characters
        where id = character_traits.character_id
        and user_id = auth.uid()
    ));

create policy "Users can delete own character traits"
    on public.character_traits for delete
    using (exists (
        select 1 from characters
        where id = character_traits.character_id
        and user_id = auth.uid()
    ));

-- Create policies for trait history
create policy "Users can view own trait history"
    on public.trait_history for select
    using (exists (
        select 1 from characters
        join character_traits on characters.id = character_traits.character_id
        where character_traits.id = trait_history.trait_id
        and characters.user_id = auth.uid()
    ));

create policy "Users can insert own trait history"
    on public.trait_history for insert
    with check (exists (
        select 1 from characters
        join character_traits on characters.id = character_traits.character_id
        where character_traits.id = trait_history.trait_id
        and characters.user_id = auth.uid()
    ));

-- Create indexes
create index character_traits_character_id_idx on character_traits(character_id);
create index trait_history_trait_id_idx on trait_history(trait_id); 