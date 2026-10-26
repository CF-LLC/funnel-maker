-- Fix "infinite recursion detected in policy for relation organizations".
-- organizations SELECT policy queried org_members, whose policies queried organizations (cycle;
-- invitations policies also reached it via organizations). Policies now call SECURITY DEFINER
-- helpers that read the tables without RLS. Policy drop/create only; no data touched.

create or replace function public.is_org_member(p_org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.organizations o where o.id = p_org_id and o.owner_id = auth.uid())
    or exists (select 1 from public.org_members m where m.org_id = p_org_id and m.user_id = auth.uid()))
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.organizations o where o.id = p_org_id and o.owner_id = auth.uid())
    or exists (select 1 from public.org_members m where m.org_id = p_org_id and m.user_id = auth.uid() and m.role in ('owner','admin')))
$$;

revoke all on function public.is_org_member(uuid), public.is_org_admin(uuid) from public, anon;
grant execute on function public.is_org_member(uuid), public.is_org_admin(uuid) to authenticated, service_role;

-- organizations (insert/update/delete policies were already non-recursive and are unchanged)
drop policy if exists "Users can read orgs they belong to" on public.organizations;
create policy "Users can read orgs they belong to" on public.organizations
  for select to authenticated using (owner_id = auth.uid() or public.is_org_member(id));

-- org_members
drop policy if exists "Users can read org members of their orgs" on public.org_members;
create policy "Users can read org members of their orgs" on public.org_members
  for select to authenticated using (user_id = auth.uid() or public.is_org_member(org_id));
drop policy if exists "Owners and admins can add members" on public.org_members;
create policy "Owners and admins can add members" on public.org_members
  for insert to authenticated with check (public.is_org_admin(org_id));
drop policy if exists "Owners and admins can update members" on public.org_members;
create policy "Owners and admins can update members" on public.org_members
  for update to authenticated using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
drop policy if exists "Owners and admins can remove members" on public.org_members;
create policy "Owners and admins can remove members" on public.org_members
  for delete to authenticated using (public.is_org_admin(org_id));

-- invitations (reached the cycle through organizations)
drop policy if exists "Owners and admins can create invitations" on public.invitations;
create policy "Owners and admins can create invitations" on public.invitations
  for insert to authenticated with check (public.is_org_admin(org_id));
drop policy if exists "Users can read invitations for their orgs" on public.invitations;
create policy "Users can read invitations for their orgs" on public.invitations
  for select to authenticated using (
    email = (select u.email from public.users u where u.id = auth.uid()) or public.is_org_admin(org_id));
