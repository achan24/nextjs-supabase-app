-- 1A. Guarantee the column is always filled correctly
alter table public.overview_targets
    alter column user_id set not null,
    alter column user_id set default auth.uid();

-- 1B. One single policy that works for SELECT, UPDATE, DELETE, INSERT
drop policy if exists "Users can view own overview targets" on public.overview_targets;
drop policy if exists "Users can insert own overview targets" on public.overview_targets;
drop policy if exists "Users can delete own overview targets" on public.overview_targets;

create policy "Users-own-rows"
on public.overview_targets
for all                           -- covers every verb
using      ( user_id = auth.uid() )
with check ( user_id = auth.uid() ); 