-- Create initial characters for all existing users who don't have one
insert into characters (user_id, level, xp)
select id, 1, 0
from auth.users
where not exists (
  select 1 from characters where user_id = auth.users.id
); 