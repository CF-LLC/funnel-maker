-- Security advisor fixes (approved by Cooper via CTO, Nov 1 2026). Additive: grants/config only, bodies unchanged.
-- 1) Fixed search_path on trigger functions (bodies already schema-qualify public.lib_links).
alter function public.lib_links_cap() set search_path = public, pg_temp;
alter function public.lib_links_guard_clicks() set search_path = public, pg_temp;

-- 2) SECURITY DEFINER functions: revoke anon/PUBLIC EXECUTE only where unused by anon.
-- lib_has_access / frm_has_access: app calls them with the service role; RLS policies using them are TO authenticated;
-- lib_record_click (definer, owner postgres) calls lib_has_access as owner. anon does not need them.
revoke execute on function public.lib_has_access(uuid) from public, anon;
grant execute on function public.lib_has_access(uuid) to authenticated, service_role;
revoke execute on function public.frm_has_access(uuid) from public, anon;
grant execute on function public.frm_has_access(uuid) to authenticated, service_role;
-- frm_responses_owner is a trigger function: EXECUTE is only checked at CREATE TRIGGER, never when it fires.
revoke execute on function public.frm_responses_owner() from public, anon, authenticated;
grant execute on function public.frm_responses_owner() to service_role;

-- Intentionally kept public:
--  fm_has_funnels_access: used by the funnels SELECT policy (TO public) that anon evaluates on public funnel pages.
--  fm_public_flag: read with the anon key in lib/flags.ts and the dashboard; only exposes *_public flags.
--  fm_submit_lead: public lead capture.

-- Rollback:
-- alter function public.lib_links_cap() reset search_path;
-- alter function public.lib_links_guard_clicks() reset search_path;
-- grant execute on function public.lib_has_access(uuid) to public, anon;
-- grant execute on function public.frm_has_access(uuid) to public, anon;
-- grant execute on function public.frm_responses_owner() to public, anon, authenticated;
