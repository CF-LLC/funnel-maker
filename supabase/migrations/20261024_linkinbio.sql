-- Tool #3: Link-in-bio. Backup: /workspace/backups/funnel-maker-20261024-060104-prG
alter table public.app_access drop constraint app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool in ('funnels', 'invoices', 'linkinbio', 'all'));

create table public.lib_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  display_name text not null default '' check (char_length(display_name) <= 60),
  bio text not null default '' check (char_length(bio) <= 160),
  avatar_url text check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 500)),
  show_funnels boolean not null default true,
  theme text not null default 'light' check (theme in ('light', 'dark', 'brand')),
  -- {"instagram": "https://...", ...}; keys limited to SOCIALS in lib/linkinbio/core.ts, validated in app + here
  socials jsonb not null default '{}'::jsonb check (jsonb_typeof(socials) = 'object' and pg_column_size(socials) < 4000),
  -- Only honored when the owner has an active All Access ('all') row.
  hide_badge boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lib_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.lib_profiles(user_id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  url text not null check (url ~ '^https://' and char_length(url) <= 1000),
  position int not null default 0,
  clicks bigint not null default 0,
  created_at timestamptz not null default now()
);
-- Max 12 links per page.
create or replace function public.lib_links_cap()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.lib_links where user_id = new.user_id) >= 12 then
    raise exception 'lib_link_limit' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger lib_links_cap before insert on public.lib_links for each row execute function public.lib_links_cap();
create index lib_links_user_pos on public.lib_links(user_id, position);

create or replace function public.lib_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('linkinbio', 'all') and active) $$;

alter table public.lib_profiles enable row level security;
alter table public.lib_links enable row level security;
-- Owner-only. Public page is served by the server (service role), read-only projection.
create policy lib_profiles_owner_select on public.lib_profiles for select to authenticated using (user_id = auth.uid());
create policy lib_profiles_owner_insert on public.lib_profiles for insert to authenticated with check (user_id = auth.uid() and public.lib_has_access(auth.uid()));
create policy lib_profiles_owner_update on public.lib_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.lib_has_access(auth.uid()));
create policy lib_links_owner_select on public.lib_links for select to authenticated using (user_id = auth.uid());
create policy lib_links_owner_insert on public.lib_links for insert to authenticated with check (user_id = auth.uid() and public.lib_has_access(auth.uid()));
create policy lib_links_owner_update on public.lib_links for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.lib_has_access(auth.uid()));
create policy lib_links_owner_delete on public.lib_links for delete to authenticated using (user_id = auth.uid());

-- Owners cannot set click counts directly.
create or replace function public.lib_links_guard_clicks()
returns trigger language plpgsql as $$
begin
  if current_setting('lib.click', true) is distinct from 'on' then
    if tg_op = 'INSERT' then new.clicks := 0; else new.clicks := old.clicks; end if;
  end if;
  return new;
end $$;
create trigger lib_links_guard_clicks before insert or update on public.lib_links for each row execute function public.lib_links_guard_clicks();

-- Records a click and returns the target URL, only for a published page whose owner has access. Service role only.
create or replace function public.lib_record_click(p_handle text, p_link uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_url text;
begin
  perform set_config('lib.click', 'on', true);
  update public.lib_links l set clicks = l.clicks + 1
    from public.lib_profiles p
   where l.id = p_link and p.user_id = l.user_id and p.handle = lower(p_handle) and p.published and public.lib_has_access(p.user_id)
  returning l.url into v_url;
  perform set_config('lib.click', 'off', true);
  return v_url;
end $$;
revoke all on function public.lib_record_click(text, uuid) from public, anon, authenticated;
grant execute on function public.lib_record_click(text, uuid) to service_role;
