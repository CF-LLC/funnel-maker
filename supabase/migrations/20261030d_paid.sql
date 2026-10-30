-- Paid? (match bank-CSV credits to open invoices). Additive only: 'paid' allowed in app_access; pd_mappings (one
-- remembered column mapping per user) and pd_matches (confirmed matches) with owner-only RLS; pd_confirm/pd_undo
-- RPCs that flip the owner's own invoice to paid/unpaid atomically; paid_public flag (OFF).
-- Bank files and raw bank rows are NEVER stored: parsing and matching happen in the browser. A match keeps only
-- invoice id, amount, date, confidence, an optional <=40-char payer text (digit runs of 6+ removed) and a short note.

alter table public.app_access drop constraint if exists app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool = any (array[
  'funnels','invoices','linkinbio','forms','proposals','testimonials','booking','dataremoval','crm','emaillist','downloads','portal','changelog','approvals','time','expenses','reports','paid','all']));

create or replace function public.pd_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('paid', 'all') and active) $$;
revoke all on function public.pd_has_access(uuid) from public, anon;
grant execute on function public.pd_has_access(uuid) to authenticated, service_role;

create table if not exists public.pd_mappings (
  user_id uuid primary key references public.users(id) on delete cascade,
  mapping jsonb not null default '{}'::jsonb check (jsonb_typeof(mapping) = 'object' and pg_column_size(mapping) <= 2000),
  tolerance_cents integer not null default 0 check (tolerance_cents between 0 and 10000),
  updated_at timestamptz not null default now()
);

create table if not exists public.pd_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  invoice_id uuid not null references public.inv_invoices(id) on delete cascade,
  amount_cents bigint not null check (amount_cents between 1 and 100000000000),
  paid_on date not null,
  confidence text not null check (confidence in ('exact', 'likely', 'possible', 'manual')),
  payer text check (payer is null or (char_length(payer) <= 40 and payer !~ '[0-9]{6,}')),
  note text check (note is null or char_length(note) <= 120),
  prev_status text not null default 'unpaid',
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
create index if not exists pd_matches_user_idx on public.pd_matches (user_id, created_at desc);
create unique index if not exists pd_matches_active_invoice on public.pd_matches (invoice_id) where undone_at is null;

alter table public.pd_mappings enable row level security;
alter table public.pd_matches enable row level security;
create policy pd_mappings_select_own on public.pd_mappings for select to authenticated using (user_id = auth.uid());
create policy pd_mappings_insert_own on public.pd_mappings for insert to authenticated with check (user_id = auth.uid() and public.pd_has_access(auth.uid()));
create policy pd_mappings_update_own on public.pd_mappings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.pd_has_access(auth.uid()));
create policy pd_matches_select_own on public.pd_matches for select to authenticated using (user_id = auth.uid());
-- pd_matches writes only through pd_confirm / pd_undo (no direct insert/update grants).
grant select, insert (user_id, mapping, tolerance_cents, updated_at), update (mapping, tolerance_cents, updated_at) on public.pd_mappings to authenticated;
grant select on public.pd_matches to authenticated;

create or replace function public.pd_confirm(p_invoice uuid, p_amount_cents bigint, p_paid_on date, p_confidence text, p_payer text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); mid uuid; payer text;
begin
  if uid is null or not public.pd_has_access(uid) then raise exception 'no access' using errcode = '42501'; end if;
  if p_paid_on is null or p_paid_on > current_date + 1 or p_paid_on < date '2000-01-01' then raise exception 'bad date' using errcode = '22023'; end if;
  payer := nullif(btrim(left(regexp_replace(coalesce(p_payer, ''), '[0-9]{6,}', '', 'g'), 40)), '');
  perform 1 from public.inv_invoices where id = p_invoice and user_id = uid and status = 'unpaid' for update;
  if not found then raise exception 'invoice not open' using errcode = 'P0002'; end if;
  update public.inv_invoices set status = 'paid', paid_at = (p_paid_on::timestamp + interval '12 hours') at time zone 'UTC', updated_at = now() where id = p_invoice;
  insert into public.pd_matches (user_id, invoice_id, amount_cents, paid_on, confidence, payer, note)
  values (uid, p_invoice, p_amount_cents, p_paid_on, p_confidence, payer, nullif(btrim(left(coalesce(p_note, ''), 120)), ''))
  returning id into mid;
  return mid;
end $$;

create or replace function public.pd_undo(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m record;
begin
  if uid is null or not public.pd_has_access(uid) then raise exception 'no access' using errcode = '42501'; end if;
  select * into m from public.pd_matches where id = p_match and user_id = uid and undone_at is null for update;
  if not found then raise exception 'match not found' using errcode = 'P0002'; end if;
  update public.pd_matches set undone_at = now() where id = p_match;
  update public.inv_invoices set status = m.prev_status, paid_at = null, updated_at = now() where id = m.invoice_id and user_id = uid and status = 'paid';
end $$;
revoke all on function public.pd_confirm(uuid, bigint, date, text, text, text) from public, anon;
revoke all on function public.pd_undo(uuid) from public, anon;
grant execute on function public.pd_confirm(uuid, bigint, date, text, text, text) to authenticated;
grant execute on function public.pd_undo(uuid) to authenticated;

insert into public.feature_flags (key, enabled, description)
values ('paid_public', false, 'Show Paid? on home, pricing and the dashboard without a rebuild')
on conflict (key) do nothing;
