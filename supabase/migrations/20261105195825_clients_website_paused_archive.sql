-- Clients phase 1. Additive only. Does not rewrite rows, emails, or URLs.
-- Not applied to production by this change. Apply this file before serving the app
-- that reads website / archived_at. Existing owner RLS is unchanged:
--   select: user_id = auth.uid() (archived rows stay readable by that owner)
--   insert/update: user_id = auth.uid() and crm_has_access(auth.uid())
-- Archive is an update of archived_at. This migration does not delete rows and
-- does not drop the pre-existing owner DELETE policy.
-- Email stays the key. Optional-email leads are deferred (see docs/clients-phase1.md).

alter table public.crm_contacts add column if not exists website text;
alter table public.crm_contacts add column if not exists archived_at timestamptz;

-- Widen status. lead, active, past, and not_a_fit stay valid. paused is new.
do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'crm_contacts'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
      and pg_get_constraintdef(con.oid) ilike '%not_a_fit%'
  loop
    execute format('alter table public.crm_contacts drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.crm_contacts drop constraint if exists crm_contacts_status_check;
alter table public.crm_contacts
  add constraint crm_contacts_status_check
  check (status in ('lead', 'active', 'paused', 'past', 'not_a_fit'));

alter table public.crm_contacts drop constraint if exists crm_contacts_website_check;
alter table public.crm_contacts
  add constraint crm_contacts_website_check
  check (
    website is null
    or (
      char_length(website) between 8 and 500
      and website ~* '^https?://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:[0-9]{1,5})?(/[^\s]*)?$'
    )
  );

-- Rollback (one transaction). Fails if any row is still status 'paused' or has a website;
-- clear those first if you intend to roll back. archived_at values are dropped with the column.
-- begin;
--   alter table public.crm_contacts drop constraint if exists crm_contacts_website_check;
--   alter table public.crm_contacts drop constraint if exists crm_contacts_status_check;
--   alter table public.crm_contacts add constraint crm_contacts_status_check
--     check (status in ('lead', 'active', 'past', 'not_a_fit'));
--   alter table public.crm_contacts drop column if exists website;
--   alter table public.crm_contacts drop column if exists archived_at;
-- commit;
