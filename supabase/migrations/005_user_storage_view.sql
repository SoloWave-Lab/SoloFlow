-- Create materialized view for user storage aggregation
-- This view aggregates total storage usage per user from the assets table

-- Drop the materialized view if it exists (to allow recreation)
drop materialized view if exists user_storage;

-- Create the materialized view
create materialized view user_storage as
select 
  user_id,
  coalesce(sum(size_bytes), 0) as total_storage_bytes,
  count(*) as total_files
from assets
where deleted_at is null
group by user_id;

-- Create a unique index on user_id for fast lookups
create unique index if not exists idx_user_storage_user_id on user_storage(user_id);

-- Optional: Create a function to refresh the materialized view
-- This can be called periodically or after asset changes
create or replace function refresh_user_storage()
returns void
language plpgsql
as $$
begin
  refresh materialized view concurrently user_storage;
end;
$$;