-- Additive. "Made with SaaS Nation" referral tag (?ref=<tool>) on acquisition events, plus a 'cta' event kind
-- (anonymous click on a signup/pricing call to action). Still no email, no IP; service role only.
alter table public.acquisition_events add column if not exists ref text check (ref is null or ref ~ '^[a-z]{2,20}$');
-- Widen (never narrow) the kind check: existing rows all stay valid.
alter table public.acquisition_events drop constraint if exists acquisition_events_kind_check;
alter table public.acquisition_events add constraint acquisition_events_kind_check check (kind in ('visit', 'free_tool', 'signup', 'cta'));
create index if not exists acquisition_events_ref_idx on public.acquisition_events (ref) where ref is not null;
