-- Rework PR 6: GLOBAL runtime flag for the job-based homepage. Additive, default OFF.
-- Read server-side with the service role (lib/home/v2-flag.ts); not a *_public key, so fm_public_flag never exposes it.
insert into public.feature_flags (key, enabled, description) values ('homepage_v2', false, 'Job-based homepage (rework PR 6). Global; preview with /?hp=2.') on conflict (key) do nothing;
-- Turn on (needs Cooper's OK):  update public.feature_flags set enabled = true  where key = 'homepage_v2';
-- Rollback (off):               update public.feature_flags set enabled = false where key = 'homepage_v2';
-- Full rollback:                delete from public.feature_flags where key = 'homepage_v2';
