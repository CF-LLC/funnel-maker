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

-- Ordinary rollback is an application/image rollback only. Keep this migration's
-- columns, the widened status check, and every stored value (website, paused, archived_at).
-- The previous app (59dacf05) does not show the new fields. It does not erase rows or those columns.
-- Do not drop website or archived_at, and do not narrow the status check or clear paused/website
-- values. That would destroy user data and is not an authorized rollback.
-- While that older build is running, do not open and save a Paused client: it does not
-- recognize paused, so a save can rewrite the status to lead. Leave those rows untouched
-- until a build that includes paused is restored.
