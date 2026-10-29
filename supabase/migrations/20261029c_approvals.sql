-- Approval link: additive. app_access already allows 'approvals' (20261029b).
-- ap_* tables with owner-only RLS via ap_has_access(), a PRIVATE ap-files bucket with owner-folder policies,
-- and the approvals_public flag (OFF). Clients never touch tables or Storage: /a/<token> and its comment/decision
-- actions go through server routes (service role) that check the token, the revoked flag and the owner's access.
-- Owners can't set a client's decision: the decision columns are not granted to authenticated.

create or replace function public.ap_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('approvals', 'all') and active) $$;
revoke all on function public.ap_has_access(uuid) from public, anon;
grant execute on function public.ap_has_access(uuid) to authenticated, service_role;

create table if not exists public.ap_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  client_name text not null check (char_length(client_name) between 1 and 120),
  client_email text check (client_email is null or (client_email = lower(client_email) and char_length(client_email) <= 200)),
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')) check (token ~ '^[0-9a-f]{64}$'),
  revoked boolean not null default false,
  last_viewed_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ap_items_user_idx on public.ap_items (user_id, created_at desc);

create table if not exists public.ap_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_id uuid not null references public.ap_items(id) on delete cascade,
  number integer not null check (number between 1 and 999),
  kind text not null check (kind in ('file', 'video')),
  path text unique check (path is null or char_length(path) <= 500),
  name text check (name is null or char_length(name) <= 200),
  mime text check (mime is null or mime in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp')),
  size_bytes bigint check (size_bytes is null or size_bytes between 1 and 26214400),
  video_url text check (video_url is null or (video_url ~ '^https://' and char_length(video_url) <= 500)),
  note text check (note is null or char_length(note) <= 1000),
  status text not null default 'waiting' check (status in ('waiting', 'changes', 'approved')),
  decided_name text check (decided_name is null or char_length(decided_name) <= 120),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (item_id, number),
  check ((kind = 'file' and path is not null and name is not null and mime is not null and size_bytes is not null and video_url is null)
      or (kind = 'video' and video_url is not null and path is null)),
  check (path is null or (split_part(path, '/', 1) = user_id::text and split_part(path, '/', 2) = item_id::text))
);
create index if not exists ap_versions_item_idx on public.ap_versions (item_id, number desc);

create table if not exists public.ap_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_id uuid not null references public.ap_items(id) on delete cascade,
  version_id uuid not null references public.ap_versions(id) on delete cascade,
  author text not null default 'owner' check (author in ('owner', 'client')),
  name text check (name is null or char_length(name) <= 120),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists ap_comments_item_idx on public.ap_comments (item_id, created_at);

-- Children must belong to an item of the same owner (and a comment to a version of that item).
create or replace function public.ap_check_child()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.ap_items i where i.id = new.item_id and i.user_id = new.user_id) then
    raise exception 'item not owned';
  end if;
  if tg_table_name = 'ap_comments' then
    if not exists (select 1 from public.ap_versions v where v.id = (to_jsonb(new) ->> 'version_id')::uuid and v.item_id = new.item_id) then
      raise exception 'version not in item';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.ap_check_child() from public, anon, authenticated;
drop trigger if exists ap_versions_owned on public.ap_versions;
create trigger ap_versions_owned before insert or update on public.ap_versions for each row execute function public.ap_check_child();
drop trigger if exists ap_comments_owned on public.ap_comments;
create trigger ap_comments_owned before insert or update on public.ap_comments for each row execute function public.ap_check_child();

alter table public.ap_items enable row level security;
alter table public.ap_versions enable row level security;
alter table public.ap_comments enable row level security;

create policy ap_items_select_own on public.ap_items for select to authenticated using (user_id = auth.uid());
create policy ap_items_insert_own on public.ap_items for insert to authenticated with check (user_id = auth.uid() and public.ap_has_access(auth.uid()));
create policy ap_items_update_own on public.ap_items for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.ap_has_access(auth.uid()));
create policy ap_items_delete_own on public.ap_items for delete to authenticated using (user_id = auth.uid());
create policy ap_versions_select_own on public.ap_versions for select to authenticated using (user_id = auth.uid());
create policy ap_versions_insert_own on public.ap_versions for insert to authenticated with check (user_id = auth.uid() and public.ap_has_access(auth.uid()));
create policy ap_versions_delete_own on public.ap_versions for delete to authenticated using (user_id = auth.uid());
create policy ap_comments_select_own on public.ap_comments for select to authenticated using (user_id = auth.uid());
create policy ap_comments_insert_own on public.ap_comments for insert to authenticated with check (user_id = auth.uid() and author = 'owner' and public.ap_has_access(auth.uid()));
create policy ap_comments_delete_own on public.ap_comments for delete to authenticated using (user_id = auth.uid());

revoke all on public.ap_items, public.ap_versions, public.ap_comments from anon;
revoke all on public.ap_items, public.ap_versions, public.ap_comments from authenticated;
grant select, delete on public.ap_items, public.ap_versions, public.ap_comments to authenticated;
grant insert (user_id, title, client_name, client_email) on public.ap_items to authenticated;
grant update (title, client_name, client_email, revoked, token, updated_at) on public.ap_items to authenticated;
-- No update on ap_versions and no insert of status/decided_*: only the client (server route) answers.
grant insert (user_id, item_id, number, kind, path, name, mime, size_bytes, video_url, note) on public.ap_versions to authenticated;
grant insert (user_id, item_id, version_id, body) on public.ap_comments to authenticated;

-- PRIVATE bucket: 25 MB per file, images and PDF only. No anon policies, so the public can't list or read.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ap-files', 'ap-files', false, 26214400, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy ap_files_obj_select_own on storage.objects for select to authenticated
  using (bucket_id = 'ap-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy ap_files_obj_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'ap-files' and (storage.foldername(name))[1] = auth.uid()::text and public.ap_has_access(auth.uid()));
create policy ap_files_obj_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'ap-files' and (storage.foldername(name))[1] = auth.uid()::text);

insert into public.feature_flags (key, enabled, description)
values ('approvals_public', false, 'Show Approval link on home, pricing and the dashboard without a rebuild')
on conflict (key) do nothing;
