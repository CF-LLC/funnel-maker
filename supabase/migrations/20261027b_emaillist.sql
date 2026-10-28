-- Email list (subscribers + broadcasts). Additive only: 'emaillist' allowed in app_access, el_* tables with
-- owner-only RLS via el_has_access(), and the emaillist_public launch flag (default OFF).
-- Public signup / confirm / unsubscribe go through server routes using the service role (never anon table access).

alter table public.app_access drop constraint if exists app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool = any (array[
  'funnels','invoices','linkinbio','forms','proposals','testimonials','booking','dataremoval','crm','emaillist','all']));

create or replace function public.el_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('emaillist', 'all') and active) $$;
revoke all on function public.el_has_access(uuid) from public, anon;
grant execute on function public.el_has_access(uuid) to authenticated, service_role;

-- One row per account: sender identity, CAN-SPAM mailing address, public page and send gates.
create table if not exists public.el_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  slug text unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  from_name text check (char_length(from_name) <= 80),
  reply_to text check (reply_to is null or (reply_to = lower(btrim(reply_to)) and char_length(reply_to) between 3 and 320)),
  mailing_address text check (char_length(mailing_address) <= 300),
  page_title text check (char_length(page_title) <= 120),
  page_blurb text check (char_length(page_blurb) <= 600),
  double_opt_in boolean not null default true,
  daily_cap integer not null default 200 check (daily_cap between 1 and 1000),
  -- Demo mode is ON until the owner explicitly turns real sending on.
  sending_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.el_subscribers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and char_length(email) between 3 and 320),
  name text check (char_length(name) <= 200),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  status text not null default 'pending' check (status in ('pending','subscribed','unsubscribed')),
  source text not null default 'manual' check (source in ('manual','import','form')),
  -- Consent record: how and when this person agreed (double opt-in, or the owner's attestation).
  consent text not null check (consent in ('double_opt_in','single_opt_in','owner_attested')),
  consent_at timestamptz not null default now(),
  consent_detail text check (char_length(consent_detail) <= 300),
  confirm_token uuid default gen_random_uuid(),
  unsub_token uuid not null default gen_random_uuid() unique,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  unsub_broadcast_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, email)
);
create index if not exists el_subscribers_user_status_idx on public.el_subscribers (user_id, status, created_at desc);
create unique index if not exists el_subscribers_confirm_token_idx on public.el_subscribers (confirm_token) where confirm_token is not null;

create table if not exists public.el_broadcasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  subject text not null default '' check (char_length(subject) <= 200),
  preheader text not null default '' check (char_length(preheader) <= 200),
  body text not null default '' check (char_length(body) <= 50000),
  tag text check (char_length(tag) <= 40),
  status text not null default 'draft' check (status in ('draft','sending','sent','failed')),
  recipients integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists el_broadcasts_user_idx on public.el_broadcasts (user_id, created_at desc);

-- One row per delivery attempt. Used for stats and the rolling 24h daily cap.
create table if not exists public.el_sends (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  broadcast_id uuid references public.el_broadcasts(id) on delete cascade,
  subscriber_id uuid references public.el_subscribers(id) on delete set null,
  kind text not null default 'broadcast' check (kind in ('broadcast','test','confirm')),
  status text not null check (status in ('sent','failed')),
  created_at timestamptz not null default now()
);
create index if not exists el_sends_user_created_idx on public.el_sends (user_id, created_at desc);

-- Consent guardrails for owner (authenticated) writes. The service role (public signup, confirm,
-- unsubscribe, sending) is not restricted here.
create or replace function public.el_subscribers_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user <> 'authenticated' then return new; end if;
  if tg_op = 'INSERT' then
    -- Owners can only add people they attest agreed (manual add / CSV import); double opt-in rows come from the public form.
    if new.consent <> 'owner_attested' or new.status <> 'subscribed' then
      raise exception 'owner adds must be owner_attested and subscribed';
    end if;
    new.confirm_token := null; new.unsub_broadcast_id := null; new.confirmed_at := null; new.unsubscribed_at := null;
    return new;
  end if;
  -- UPDATE: consent fields and tokens are immutable; status may only move to 'unsubscribed'.
  if new.email <> old.email or new.consent <> old.consent or new.consent_at <> old.consent_at
     or new.consent_detail is distinct from old.consent_detail or new.unsub_token <> old.unsub_token
     or new.confirm_token is distinct from old.confirm_token or new.source <> old.source
     or new.confirmed_at is distinct from old.confirmed_at then
    raise exception 'consent record is read-only';
  end if;
  if new.status <> old.status then
    if new.status <> 'unsubscribed' then raise exception 'only the subscriber can resubscribe'; end if;
    new.unsubscribed_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists el_subscribers_guard on public.el_subscribers;
create trigger el_subscribers_guard before insert or update on public.el_subscribers
  for each row execute function public.el_subscribers_guard();

alter table public.el_settings enable row level security;
alter table public.el_subscribers enable row level security;
alter table public.el_broadcasts enable row level security;
alter table public.el_sends enable row level security;

create policy el_settings_select_own on public.el_settings for select to authenticated using (user_id = auth.uid());
create policy el_settings_insert_own on public.el_settings for insert to authenticated with check (user_id = auth.uid() and public.el_has_access(auth.uid()));
create policy el_settings_update_own on public.el_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.el_has_access(auth.uid()));

create policy el_subscribers_select_own on public.el_subscribers for select to authenticated using (user_id = auth.uid());
create policy el_subscribers_insert_own on public.el_subscribers for insert to authenticated with check (user_id = auth.uid() and public.el_has_access(auth.uid()));
create policy el_subscribers_update_own on public.el_subscribers for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.el_has_access(auth.uid()));
create policy el_subscribers_delete_own on public.el_subscribers for delete to authenticated using (user_id = auth.uid());

create policy el_broadcasts_select_own on public.el_broadcasts for select to authenticated using (user_id = auth.uid());
create policy el_broadcasts_insert_own on public.el_broadcasts for insert to authenticated with check (user_id = auth.uid() and public.el_has_access(auth.uid()));
-- Sent broadcasts are history: only drafts can be edited or deleted by the owner (sending is server-side).
create policy el_broadcasts_update_own on public.el_broadcasts for update to authenticated using (user_id = auth.uid() and status = 'draft') with check (user_id = auth.uid() and status = 'draft' and public.el_has_access(auth.uid()));
create policy el_broadcasts_delete_own on public.el_broadcasts for delete to authenticated using (user_id = auth.uid() and status = 'draft');

-- Sends are written only by the server (service role); owners can read their own.
create policy el_sends_select_own on public.el_sends for select to authenticated using (user_id = auth.uid());

revoke all on public.el_settings, public.el_subscribers, public.el_broadcasts, public.el_sends from anon;
-- Supabase default privileges grant everything to authenticated; reset so the column grants below are the whole story.
revoke all on public.el_settings, public.el_subscribers, public.el_broadcasts, public.el_sends from authenticated;
grant select, insert, update on public.el_settings to authenticated;
grant select, insert, update, delete on public.el_broadcasts to authenticated;
-- confirm_token is never readable by owners (they must not be able to confirm on a subscriber's behalf).
grant select (id, user_id, email, name, tags, status, source, consent, consent_at, consent_detail, unsub_token, confirmed_at,
  unsubscribed_at, unsub_broadcast_id, created_at, updated_at) on public.el_subscribers to authenticated;
grant insert (user_id, email, name, tags, status, source, consent, consent_detail) on public.el_subscribers to authenticated;
grant update (name, tags, status) on public.el_subscribers to authenticated;
grant delete on public.el_subscribers to authenticated;
grant select on public.el_sends to authenticated;

insert into public.feature_flags (key, enabled, description)
values ('emaillist_public', false, 'Show Email list on home, pricing and the dashboard without a rebuild')
on conflict (key) do nothing;
