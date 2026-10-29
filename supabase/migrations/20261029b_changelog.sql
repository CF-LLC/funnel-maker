-- Change log (scope-creep approvals). Additive only: 'changelog' (and the next tool, 'approvals') allowed in app_access,
-- cl_* tables with owner-only RLS via cl_has_access(), and the changelog_public flag (OFF).
-- Clients never touch tables: /c/<token> and its "OK, add it" / "No thanks" go through a server route (service role)
-- that checks the token, the revoked flag and the owner's access. Owners can't set a client's decision themselves:
-- a trigger only lets the service role write decisions, and editing a decided request's estimate resets it to pending.
-- Approved extras export into the EXISTING Invoices tables (inv_invoices / inv_invoice_lines); nothing is duplicated.

alter table public.app_access drop constraint if exists app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool = any (array[
  'funnels','invoices','linkinbio','forms','proposals','testimonials','booking','dataremoval','crm','emaillist','downloads','portal','changelog','approvals','all']));

create or replace function public.cl_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('changelog', 'all') and active) $$;
revoke all on function public.cl_has_access(uuid) from public, anon;
grant execute on function public.cl_has_access(uuid) to authenticated, service_role;

create table if not exists public.cl_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  client_name text not null check (char_length(client_name) between 1 and 120),
  client_email text check (client_email is null or (client_email = lower(btrim(client_email)) and char_length(client_email) between 3 and 320)),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  hourly_rate_cents bigint not null default 0 check (hourly_rate_cents between 0 and 100000000),
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')) check (token ~ '^[0-9a-f]{64}$'),
  revoked boolean not null default false,
  last_viewed_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cl_projects_user_idx on public.cl_projects (user_id, created_at desc);

create table if not exists public.cl_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.cl_projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text check (char_length(description) <= 2000),
  est_kind text not null default 'price' check (est_kind in ('hours','price')),
  hours numeric(8,2) not null default 0 check (hours between 0 and 10000),
  price_cents bigint not null default 0 check (price_cents between 0 and 100000000),
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  decided_name text check (char_length(decided_name) <= 120),
  decided_note text check (char_length(decided_note) <= 1000),
  decided_at timestamptz,
  invoice_id uuid references public.inv_invoices(id) on delete set null,
  invoiced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cl_requests_project_idx on public.cl_requests (project_id, created_at);

create or replace function public.cl_check_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare is_owner boolean := coalesce(auth.role(), '') in ('authenticated', 'anon');
begin
  if not exists (select 1 from public.cl_projects p where p.id = new.project_id and p.user_id = new.user_id) then
    raise exception 'project not owned';
  end if;
  if new.invoice_id is not null and not exists (select 1 from public.inv_invoices i where i.id = new.invoice_id and i.user_id = new.user_id) then
    raise exception 'invoice not owned';
  end if;
  if is_owner then
    if tg_op = 'INSERT' then
      new.status := 'pending'; new.decided_name := null; new.decided_note := null; new.decided_at := null;
    else
      -- An edited estimate/title needs a fresh answer from the client.
      if (new.title, coalesce(new.description,''), new.est_kind, new.hours, new.price_cents) is distinct from
         (old.title, coalesce(old.description,''), old.est_kind, old.hours, old.price_cents) and old.invoice_id is null then
        new.status := 'pending'; new.decided_name := null; new.decided_note := null; new.decided_at := null;
      elsif (new.status, new.decided_name, new.decided_note, new.decided_at) is distinct from
            (old.status, old.decided_name, old.decided_note, old.decided_at) then
        raise exception 'only the client can answer a request';
      end if;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.cl_check_request() from public, anon, authenticated;
drop trigger if exists cl_requests_check on public.cl_requests;
create trigger cl_requests_check before insert or update on public.cl_requests for each row execute function public.cl_check_request();

alter table public.cl_projects enable row level security;
alter table public.cl_requests enable row level security;

create policy cl_projects_select_own on public.cl_projects for select to authenticated using (user_id = auth.uid());
create policy cl_projects_insert_own on public.cl_projects for insert to authenticated with check (user_id = auth.uid() and public.cl_has_access(auth.uid()));
create policy cl_projects_update_own on public.cl_projects for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.cl_has_access(auth.uid()));
create policy cl_projects_delete_own on public.cl_projects for delete to authenticated using (user_id = auth.uid());
create policy cl_requests_own on public.cl_requests for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.cl_has_access(auth.uid()));

revoke all on public.cl_projects, public.cl_requests from anon;
revoke all on public.cl_projects, public.cl_requests from authenticated;
grant select, delete on public.cl_projects, public.cl_requests to authenticated;
grant insert (user_id, title, client_name, client_email, currency, hourly_rate_cents) on public.cl_projects to authenticated;
grant update (title, client_name, client_email, currency, hourly_rate_cents, revoked, token, updated_at) on public.cl_projects to authenticated;
grant insert (user_id, project_id, title, description, est_kind, hours, price_cents) on public.cl_requests to authenticated;
grant update (title, description, est_kind, hours, price_cents, invoice_id, invoiced_at, updated_at) on public.cl_requests to authenticated;

insert into public.feature_flags (key, enabled, description)
values ('changelog_public', false, 'Show Change log on home, pricing and the dashboard without a rebuild')
on conflict (key) do nothing;
