-- Tool #5: Proposals. Additive only. Backup: /workspace/backups/funnel-maker-20261024-071528-prProposals
alter table public.app_access drop constraint app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool in ('funnels', 'invoices', 'linkinbio', 'forms', 'proposals', 'all'));

-- Paid tool: proposals row or All Access. Not part of the founding plan.
create or replace function public.prp_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('proposals', 'all') and active) $$;
revoke all on function public.prp_has_access(uuid) from public, anon;
grant execute on function public.prp_has_access(uuid) to authenticated, service_role;

create table public.prp_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  client_id uuid references public.inv_clients(id) on delete set null,
  client_name text not null check (char_length(client_name) between 1 and 200),
  client_email text check (client_email is null or char_length(client_email) <= 320),
  client_address text check (client_address is null or char_length(client_address) <= 1000),
  title text not null check (char_length(title) between 1 and 150),
  intro text not null default '' check (char_length(intro) <= 2000),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  expires_on date,
  -- 'expired' is computed in the app from expires_on; it is never stored.
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined')),
  accepted_name text check (accepted_name is null or char_length(accepted_name) between 1 and 200),
  responded_at timestamptz,
  invoice_id uuid references public.inv_invoices(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prp_proposals_user_idx on public.prp_proposals(user_id, created_at desc);

create table public.prp_proposal_lines (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.prp_proposals(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  position int not null default 0,
  description text not null check (char_length(description) between 1 and 500),
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0)
);
create index prp_lines_proposal_idx on public.prp_proposal_lines(proposal_id);

-- Lines must belong to a proposal the same user owns, and can't change once the client responded.
create or replace function public.prp_line_owner_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.proposal_id, old.proposal_id); uid uuid := coalesce(new.user_id, old.user_id);
begin
  if not exists (select 1 from public.prp_proposals where id = pid and user_id = uid) then
    raise exception 'proposal_not_owned' using errcode = '42501';
  end if;
  if exists (select 1 from public.prp_proposals where id = pid and status in ('accepted', 'declined')) then
    raise exception 'proposal_locked' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;
revoke all on function public.prp_line_owner_check() from public, anon, authenticated;
create trigger prp_line_owner_check before insert or update or delete on public.prp_proposal_lines
  for each row execute function public.prp_line_owner_check();

-- Owners move draft <-> sent only. Accept/decline is recorded by the server (service role) from the public page.
-- After a response, the owner can only attach the converted invoice.
create or replace function public.prp_proposal_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if coalesce(auth.role(), '') = 'service_role' then return new; end if;
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'sent') or new.accepted_name is not null or new.responded_at is not null or new.invoice_id is not null then
      raise exception 'proposal_bad_insert' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if old.status in ('accepted', 'declined') then
    if (to_jsonb(new) - 'invoice_id' - 'updated_at') <> (to_jsonb(old) - 'invoice_id' - 'updated_at') or old.status <> 'accepted' or old.invoice_id is not null then
      raise exception 'proposal_locked' using errcode = 'P0001';
    end if;
    if new.invoice_id is not null and not exists (select 1 from public.inv_invoices where id = new.invoice_id and user_id = old.user_id) then
      raise exception 'invoice_not_owned' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.status not in ('draft', 'sent') or new.accepted_name is distinct from old.accepted_name
     or new.responded_at is distinct from old.responded_at or new.invoice_id is not null then
    raise exception 'proposal_status_server_only' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.prp_proposal_rules() from public, anon, authenticated;
create trigger prp_proposal_rules before insert or update on public.prp_proposals
  for each row execute function public.prp_proposal_rules();

-- RLS: own rows; writes only while the user has proposals (or all) access. Reads stay after access ends.
do $$
declare t text;
begin
  foreach t in array array['prp_proposals', 'prp_proposal_lines'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid())', t||'_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid() and public.prp_has_access(auth.uid()))', t||'_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.prp_has_access(auth.uid()))', t||'_update_own', t);
  end loop;
end $$;
-- Proposals themselves are never deleted (like Forms); only line items can be removed while editing.
create policy prp_proposal_lines_delete_own on public.prp_proposal_lines for delete to authenticated
  using (user_id = auth.uid() and public.prp_has_access(auth.uid()));

-- Proposals users share the invoice client list: let them add clients too (extra permissive policy, existing ones untouched).
create policy inv_clients_insert_proposals on public.inv_clients for insert to authenticated
  with check (user_id = auth.uid() and public.prp_has_access(auth.uid()));
-- Public proposal page (/@handle/p/id) and accept/decline go through the server's service-role client; no anon policy.
