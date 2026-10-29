-- Client portal with onboarding checklist. Additive only: 'portal' allowed in app_access, pt_* tables with owner-only RLS
-- via pt_has_access(), a PRIVATE pt-files Storage bucket with owner-folder policies, and the portal_public flag (OFF).
-- Clients never touch tables or Storage: /p/<token> and its actions go through server routes (service role), which
-- check the token, the revoked flag and the owner's access, and hand out 60-second signed URLs for files.
-- Shares only POINT at the owner's existing invoices/proposals/bookings (no copies).

alter table public.app_access drop constraint if exists app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool = any (array[
  'funnels','invoices','linkinbio','forms','proposals','testimonials','booking','dataremoval','crm','emaillist','downloads','portal','all']));

create or replace function public.pt_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('portal', 'all') and active) $$;
revoke all on function public.pt_has_access(uuid) from public, anon;
grant execute on function public.pt_has_access(uuid) to authenticated, service_role;

-- Reusable checklist templates. items: [{title, note?, link?, who: 'client'|'owner'}]
create table if not exists public.pt_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 30 and pg_column_size(items) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pt_templates_user_idx on public.pt_templates (user_id, created_at desc);

create table if not exists public.pt_portals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_name text not null check (char_length(client_name) between 1 and 120),
  client_email text check (client_email is null or (client_email = lower(btrim(client_email)) and char_length(client_email) between 3 and 320)),
  welcome text check (char_length(welcome) <= 1000),
  -- 64 hex chars (two v4 UUIDs, 244 random bits). Regenerating replaces it, which kills the old link.
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')) check (token ~ '^[0-9a-f]{64}$'),
  revoked boolean not null default false,
  last_viewed_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pt_portals_user_idx on public.pt_portals (user_id, created_at desc);

create table if not exists public.pt_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  portal_id uuid not null references public.pt_portals(id) on delete cascade,
  kind text not null check (kind in ('invoice','proposal','booking')),
  ref_id uuid not null,
  created_at timestamptz not null default now(),
  unique (portal_id, kind, ref_id)
);
create index if not exists pt_shares_portal_idx on public.pt_shares (portal_id);

create table if not exists public.pt_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  portal_id uuid not null references public.pt_portals(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  note text check (char_length(note) <= 600),
  link text check (link is null or (link ~ '^https://' and char_length(link) <= 500)),
  who text not null default 'client' check (who in ('client','owner')),
  sort integer not null default 0,
  done_at timestamptz,
  done_by text check (done_by in ('client','owner')),
  created_at timestamptz not null default now()
);
create index if not exists pt_tasks_portal_idx on public.pt_tasks (portal_id, sort, created_at);

create table if not exists public.pt_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  portal_id uuid not null references public.pt_portals(id) on delete cascade,
  path text not null unique check (char_length(path) <= 500),
  name text not null check (char_length(name) between 1 and 200),
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  mime text not null check (char_length(mime) <= 100),
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  check (split_part(path, '/', 1) = user_id::text and split_part(path, '/', 2) = portal_id::text)
);
create index if not exists pt_files_portal_idx on public.pt_files (portal_id, created_at);

-- Child rows must belong to a portal of the same owner, and a share must point at the owner's OWN record.
create or replace function public.pt_check_child()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.pt_portals p where p.id = new.portal_id and p.user_id = new.user_id) then
    raise exception 'portal not owned';
  end if;
  if tg_table_name = 'pt_shares' then
    if (new.kind = 'invoice' and not exists (select 1 from public.inv_invoices where id = new.ref_id and user_id = new.user_id))
    or (new.kind = 'proposal' and not exists (select 1 from public.prp_proposals where id = new.ref_id and user_id = new.user_id))
    or (new.kind = 'booking' and not exists (select 1 from public.bk_bookings where id = new.ref_id and user_id = new.user_id)) then
      raise exception 'record not owned';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.pt_check_child() from public, anon, authenticated;
drop trigger if exists pt_shares_owned on public.pt_shares;
create trigger pt_shares_owned before insert or update on public.pt_shares for each row execute function public.pt_check_child();
drop trigger if exists pt_tasks_owned on public.pt_tasks;
create trigger pt_tasks_owned before insert or update on public.pt_tasks for each row execute function public.pt_check_child();
drop trigger if exists pt_files_owned on public.pt_files;
create trigger pt_files_owned before insert or update on public.pt_files for each row execute function public.pt_check_child();

alter table public.pt_templates enable row level security;
alter table public.pt_portals enable row level security;
alter table public.pt_shares enable row level security;
alter table public.pt_tasks enable row level security;
alter table public.pt_files enable row level security;

create policy pt_templates_own on public.pt_templates for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.pt_has_access(auth.uid()));
create policy pt_portals_select_own on public.pt_portals for select to authenticated using (user_id = auth.uid());
create policy pt_portals_insert_own on public.pt_portals for insert to authenticated with check (user_id = auth.uid() and public.pt_has_access(auth.uid()));
create policy pt_portals_update_own on public.pt_portals for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.pt_has_access(auth.uid()));
create policy pt_portals_delete_own on public.pt_portals for delete to authenticated using (user_id = auth.uid());
create policy pt_shares_own on public.pt_shares for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.pt_has_access(auth.uid()));
create policy pt_tasks_own on public.pt_tasks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.pt_has_access(auth.uid()));
create policy pt_files_select_own on public.pt_files for select to authenticated using (user_id = auth.uid());
create policy pt_files_insert_own on public.pt_files for insert to authenticated with check (user_id = auth.uid() and public.pt_has_access(auth.uid()));
create policy pt_files_delete_own on public.pt_files for delete to authenticated using (user_id = auth.uid());

revoke all on public.pt_templates, public.pt_portals, public.pt_shares, public.pt_tasks, public.pt_files from anon;
revoke all on public.pt_templates, public.pt_portals, public.pt_shares, public.pt_tasks, public.pt_files from authenticated;
grant select, insert, update, delete on public.pt_templates, public.pt_shares, public.pt_tasks to authenticated;
grant select, delete on public.pt_portals to authenticated;
-- view stats are server-maintained; token is replaced only through the regenerate route (update (token)).
grant insert (user_id, client_name, client_email, welcome) on public.pt_portals to authenticated;
grant update (client_name, client_email, welcome, revoked, token, updated_at) on public.pt_portals to authenticated;
grant select, delete on public.pt_files to authenticated;
grant insert (user_id, portal_id, path, name, size_bytes, mime) on public.pt_files to authenticated;

-- PRIVATE bucket: 25 MB per file, fixed file types. No anon policies, so the public can't list or read.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pt-files', 'pt-files', false, 26214400, array['application/pdf','application/zip','application/x-zip-compressed',
  'image/png','image/jpeg','image/webp','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do nothing;

create policy pt_files_obj_select_own on storage.objects for select to authenticated
  using (bucket_id = 'pt-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy pt_files_obj_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'pt-files' and (storage.foldername(name))[1] = auth.uid()::text and public.pt_has_access(auth.uid()));
create policy pt_files_obj_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'pt-files' and (storage.foldername(name))[1] = auth.uid()::text);

insert into public.feature_flags (key, enabled, description)
values ('portal_public', false, 'Show Client portal on home, pricing and the dashboard without a rebuild')
on conflict (key) do nothing;
