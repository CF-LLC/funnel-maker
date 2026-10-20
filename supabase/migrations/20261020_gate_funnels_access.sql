-- Gate funnel creation, publishing and public serving on per-tool access (active funnels OR all row).
-- users.approved stays the manual approval flag. No data changes: lapsed owners' funnels keep is_public, they are just not served.

create or replace function public.fm_has_funnels_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('funnels', 'all') and active) $$;
revoke all on function public.fm_has_funnels_access(uuid) from public;
grant execute on function public.fm_has_funnels_access(uuid) to anon, authenticated;

-- Lapsed = had funnels/all access before, none active now. Pending signups (no rows yet) are not lapsed.
create or replace function public.fm_funnels_lapsed(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('funnels', 'all'))
          and not public.fm_has_funnels_access(uid) $$;
revoke all on function public.fm_funnels_lapsed(uuid) from public, anon;
grant execute on function public.fm_funnels_lapsed(uuid) to authenticated;

-- Public read only while the owner has access. Owners always see their own rows.
drop policy if exists "Users can read own funnels" on public.funnels;
create policy "Users can read own funnels" on public.funnels for select
  using (auth.uid() = user_id or (is_public = true and public.fm_has_funnels_access(user_id)));

-- Publishing: approved AND active funnels/all access, max 3 live.
create or replace function public.fm_enforce_publish()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_live int;
begin
  if auth.role() = 'service_role' then return new; end if;
  if tg_op = 'INSERT' and public.fm_funnels_lapsed(new.user_id) then
    raise exception 'funnels_access_required' using errcode = 'P0001';
  end if;
  if new.is_public and (tg_op = 'INSERT' or coalesce(old.is_public, false) = false) then
    if not exists (select 1 from public.users where id = new.user_id and approved) then
      raise exception 'account_pending_approval' using errcode = 'P0001';
    end if;
    if not public.fm_has_funnels_access(new.user_id) then
      raise exception 'funnels_access_required' using errcode = 'P0001';
    end if;
    select count(*) into v_live from public.funnels where user_id = new.user_id and is_public and id <> new.id;
    if v_live >= 3 then raise exception 'live_funnel_limit' using errcode = 'P0001'; end if;
  end if;
  return new;
end $$;
revoke all on function public.fm_enforce_publish() from public, anon, authenticated;
-- Trigger now fires on every insert (creation gate) as well as is_public changes.
drop trigger if exists fm_enforce_publish on public.funnels;
create trigger fm_enforce_publish before insert or update of is_public on public.funnels
  for each row execute function public.fm_enforce_publish();

-- Leads only for funnels whose owner has access.
create or replace function public.fm_submit_lead(p_slug text, p_name text, p_email text, p_phone text, p_message text, p_template text, p_utm jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_funnel uuid; v_id uuid;
begin
  select id into v_funnel from public.funnels where slug = p_slug and is_public = true and public.fm_has_funnels_access(user_id);
  if v_funnel is null then raise exception 'funnel_not_found' using errcode = 'P0002'; end if;
  insert into public.fm_leads (funnel_id, name, email, phone, message, template, utm)
  values (v_funnel, nullif(p_name, ''), p_email, nullif(p_phone, ''), nullif(p_message, ''), nullif(p_template, ''), coalesce(p_utm, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;
