-- Tie public.users to auth.users: deleting a login account removes its public.users row
-- (and, via existing cascades, its funnels and leads). Create-only: adds a constraint if missing.
-- NOT VALID skips checking existing rows, so this can never fail on or modify existing data;
-- new and updated rows are still checked.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fm_users_auth_fk' and conrelid = 'public.users'::regclass) then
    alter table public.users
      add constraint fm_users_auth_fk foreign key (id) references auth.users (id) on delete cascade not valid;
  end if;
end $$;
