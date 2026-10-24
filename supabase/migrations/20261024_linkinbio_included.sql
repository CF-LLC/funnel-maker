-- Link-in-bio is included with every paid plan: any active app_access row (any tool, 'all', or founding).
create or replace function public.lib_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and active) $$;
