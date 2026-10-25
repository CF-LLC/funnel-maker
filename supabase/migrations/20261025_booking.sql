-- Tool #7: Booking. Additive only (new extension, function, tables, policies; app_access check widened to add 'booking').
create extension if not exists btree_gist with schema extensions;

alter table public.app_access drop constraint app_access_tool_check;
alter table public.app_access add constraint app_access_tool_check check (tool in ('funnels', 'invoices', 'linkinbio', 'forms', 'proposals', 'testimonials', 'booking', 'all'));

create or replace function public.bk_has_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.app_access where user_id = uid and tool in ('booking', 'all') and active) $$;
revoke all on function public.bk_has_access(uuid) from public, anon;
grant execute on function public.bk_has_access(uuid) to authenticated, service_role;

create table public.bk_settings (
  user_id uuid primary key default auth.uid() references public.users(id) on delete cascade,
  timezone text not null default 'America/Chicago' check (char_length(timezone) between 1 and 64),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Weekly hours: one row per owner. weekly = [{"weekday":0-6,"start_min":0-1439,"end_min":1-1440}, ...] (validated in the app).
create table public.bk_availability (
  user_id uuid primary key default auth.uid() references public.users(id) on delete cascade,
  weekly jsonb not null default '[]'::jsonb check (jsonb_typeof(weekly) = 'array' and jsonb_array_length(weekly) <= 50),
  updated_at timestamptz not null default now()
);

create table public.bk_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  name text not null check (char_length(name) between 1 and 100),
  description text check (description is null or char_length(description) <= 500),
  duration_min int not null check (duration_min between 5 and 480),
  buffer_before int not null default 0 check (buffer_before between 0 and 240),
  buffer_after int not null default 0 check (buffer_after between 0 and 240),
  min_notice_min int not null default 240 check (min_notice_min between 0 and 43200),
  max_days_ahead int not null default 30 check (max_days_ahead between 1 and 365),
  location text check (location is null or char_length(location) <= 300),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

-- Bookings are inserted only by the server (service role) from the public page.
-- block_start/block_end include the meeting type's buffers; the exclusion constraint makes double booking impossible.
create table public.bk_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type_id uuid not null references public.bk_types(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  block_start timestamptz not null,
  block_end timestamptz not null,
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  notes text check (notes is null or char_length(notes) <= 1000),
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at and block_start <= starts_at and block_end >= ends_at),
  constraint bk_no_double_booking exclude using gist (user_id with =, tstzrange(block_start, block_end, '[)') with &&) where (status = 'confirmed')
);
create index bk_bookings_user_idx on public.bk_bookings(user_id, starts_at desc);

-- Owners may only cancel (status/cancelled_at); booking details are the visitor's.
create or replace function public.bk_booking_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then return new; end if;
  if tg_op = 'INSERT' then raise exception 'booking_server_only' using errcode = '42501'; end if;
  if (to_jsonb(new) - 'status' - 'cancelled_at') <> (to_jsonb(old) - 'status' - 'cancelled_at') or new.status <> 'cancelled' then
    raise exception 'booking_cancel_only' using errcode = 'P0001';
  end if;
  new.cancelled_at := now();
  return new;
end $$;
revoke all on function public.bk_booking_rules() from public, anon, authenticated;
create trigger bk_booking_rules before insert or update on public.bk_bookings for each row execute function public.bk_booking_rules();

alter table public.bk_settings enable row level security;
alter table public.bk_availability enable row level security;
alter table public.bk_types enable row level security;
alter table public.bk_bookings enable row level security;
revoke all on public.bk_settings, public.bk_availability, public.bk_types, public.bk_bookings from anon;

create policy bk_settings_select_own on public.bk_settings for select to authenticated using (user_id = auth.uid());
create policy bk_settings_insert_own on public.bk_settings for insert to authenticated with check (user_id = auth.uid() and public.bk_has_access(auth.uid()));
create policy bk_settings_update_own on public.bk_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.bk_has_access(auth.uid()));

create policy bk_availability_select_own on public.bk_availability for select to authenticated using (user_id = auth.uid());
create policy bk_availability_insert_own on public.bk_availability for insert to authenticated with check (user_id = auth.uid() and public.bk_has_access(auth.uid()));
create policy bk_availability_update_own on public.bk_availability for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.bk_has_access(auth.uid()));
create policy bk_types_select_own on public.bk_types for select to authenticated using (user_id = auth.uid());
create policy bk_types_insert_own on public.bk_types for insert to authenticated with check (user_id = auth.uid() and public.bk_has_access(auth.uid()));
create policy bk_types_update_own on public.bk_types for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.bk_has_access(auth.uid()));
-- No delete on types: deactivate instead.

create policy bk_bookings_select_own on public.bk_bookings for select to authenticated using (user_id = auth.uid());
create policy bk_bookings_update_own on public.bk_bookings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- No insert (server only) and no delete policies: bookings are cancelled, never deleted.
