-- Tool #8: Data Removal (guided opt-out tracker). Additive only: app_access check widened, new helper, two new tables.
-- Stores ONLY the user's name and per-broker status. Never address, phone or ID.
alter table public.app_access drop constraint app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool in ('funnels', 'invoices', 'linkinbio', 'forms', 'proposals', 'testimonials', 'booking', 'dataremoval', 'all'));

create or replace function public.dr_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('dataremoval', 'all') and active) $$;
revoke all on function public.dr_has_access(uuid) from public, anon;
grant execute on function public.dr_has_access(uuid) to authenticated, service_role;

create table public.dr_profiles (
  user_id uuid primary key default auth.uid() references public.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 100),
  updated_at timestamptz not null default now()
);

create table public.dr_status (
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  broker_id text not null check (broker_id ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  status text not null check (status in ('not_listed', 'requested', 'removed', 'reappeared')),
  updated_at timestamptz not null default now(),
  primary key (user_id, broker_id)
);

alter table public.dr_profiles enable row level security;
alter table public.dr_status enable row level security;
revoke all on public.dr_profiles, public.dr_status from anon;

create policy dr_profiles_select_own on public.dr_profiles for select to authenticated using (user_id = auth.uid());
create policy dr_profiles_insert_own on public.dr_profiles for insert to authenticated with check (user_id = auth.uid() and public.dr_has_access(auth.uid()));
create policy dr_profiles_update_own on public.dr_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.dr_has_access(auth.uid()));
create policy dr_profiles_delete_own on public.dr_profiles for delete to authenticated using (user_id = auth.uid());

create policy dr_status_select_own on public.dr_status for select to authenticated using (user_id = auth.uid());
create policy dr_status_insert_own on public.dr_status for insert to authenticated with check (user_id = auth.uid() and public.dr_has_access(auth.uid()));
create policy dr_status_update_own on public.dr_status for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.dr_has_access(auth.uid()));
create policy dr_status_delete_own on public.dr_status for delete to authenticated using (user_id = auth.uid());
