-- Rework PR 6: widen (never narrow) the site_events event check with the homepage events from homepage-rework.md.
-- NOT APPLIED in PR 6; needs approval. Until applied, these beacons are dropped silently (recordSiteEvent never throws).
alter table public.site_events drop constraint if exists site_events_event_check;
alter table public.site_events add constraint site_events_event_check check (event in ('pageview','signup_started','signup_completed','checkout_clicked','checkout_completed','free_tool_used','email_captured','upgrade_clicked','referral_landed','referral_signup','home_view','job_card_click','hero_trial_click','hero_free_tool_click','demo_view','faq_open'));
-- Rollback: re-add the previous list from 20261101b_referrals.sql (only after deleting rows with the new events).
