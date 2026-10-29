-- Additive. Per-user notification preferences. Saving a preference sends nothing: the weekly digest is built but disabled
-- (no sender exists; see lib/digest.ts and DIGEST_EMAILS_ENABLED).
create table if not exists public.user_notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_digest boolean not null default false,
  new_lead_alerts boolean not null default false,
  product_updates boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.user_notification_prefs enable row level security;
drop policy if exists "own prefs read" on public.user_notification_prefs;
create policy "own prefs read" on public.user_notification_prefs for select to authenticated using (user_id = auth.uid());
drop policy if exists "own prefs insert" on public.user_notification_prefs;
create policy "own prefs insert" on public.user_notification_prefs for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "own prefs update" on public.user_notification_prefs;
create policy "own prefs update" on public.user_notification_prefs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.user_notification_prefs from public, anon;
grant select, insert, update on public.user_notification_prefs to authenticated;
grant all on public.user_notification_prefs to service_role;
