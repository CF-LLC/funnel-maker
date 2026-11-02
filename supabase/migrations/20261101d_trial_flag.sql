-- Additive: runtime flag for the 7-day trial copy. OFF until live monthly payment links carry the trial.
insert into public.feature_flags (key, enabled, description)
values ('trial_public', false, 'Show 7-day free trial wording (monthly plans) on pricing, FAQ, Terms and Refund. Turn on only after live monthly payment links have the trial.')
on conflict (key) do nothing;
