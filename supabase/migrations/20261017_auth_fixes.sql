-- funnel-maker v1: auth/security fixes. Create-or-replace only; no drops, no data changes.

-- 1) Create the public.users row when someone signs up (funnels.user_id references it).
create or replace function public.fm_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

revoke all on function public.fm_handle_new_user() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'fm_on_auth_user_created' and tgrelid = 'auth.users'::regclass) then
    create trigger fm_on_auth_user_created after insert on auth.users
      for each row execute function public.fm_handle_new_user();
  end if;
end $$;

-- Backfill auth users that signed up before this trigger existed (insert-only).
insert into public.users (id, email)
select u.id, u.email from auth.users u
where u.email is not null
on conflict (id) do nothing;

-- 2) Lock down check_email_uniqueness (trigger-only function; no RPC access, fixed search_path).
alter function public.check_email_uniqueness() set search_path = public, auth;
revoke all on function public.check_email_uniqueness() from public, anon, authenticated;

-- 3) admin_users: the old policy queried admin_users from inside its own policy (infinite recursion).
create or replace function public.fm_is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists (select 1 from public.admin_users where id = uid) $$;

revoke all on function public.fm_is_admin(uuid) from public, anon;
grant execute on function public.fm_is_admin(uuid) to authenticated;

alter policy "Admins can read admin list" on public.admin_users
  using (id = auth.uid() or public.fm_is_admin(auth.uid()));
