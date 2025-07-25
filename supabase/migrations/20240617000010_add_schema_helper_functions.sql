-- Function to get column information
create or replace function get_column_info(table_name text)
returns table (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
security definer
as $$
begin
  return query
  select 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = $1;
end;
$$ language plpgsql;

-- Function to get policy information
create or replace function get_policies(table_name text)
returns table (
  policyname text,
  cmd text,
  qual text,
  with_check text
)
security definer
as $$
begin
  return query
  select 
    p.policyname::text,
    p.cmd::text,
    p.qual::text,
    p.with_check::text
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename = $1;
end;
$$ language plpgsql;

-- Grant execute permissions
grant execute on function get_column_info(text) to service_role;
grant execute on function get_policies(text) to service_role; 