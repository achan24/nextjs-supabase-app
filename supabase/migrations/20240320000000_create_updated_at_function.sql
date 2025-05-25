-- Create the set_updated_at function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = current_timestamp;
  return new;
end;
$$ language plpgsql; 