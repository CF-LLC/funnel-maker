// 7-day free trial copy. Shown only when the runtime flag `trial_public` (public.feature_flags) is on,
// which must be flipped only after every live MONTHLY Payment Link has the 7-day trial set. Yearly plans have no trial.
export const TRIAL_FLAG = 'trial_public'
export const TRIAL_DAYS = 7
export const TRIAL_NOTE = 'Monthly plans start with a 7-day free trial. Card required up front; cancel before day 7 ends and you are not charged. Billing starts after 7 days. Yearly plans are billed right away.'
export const TRIAL_FAQ: [string, string] = ['Is there a free trial?', 'Yes, on monthly plans: 7 days free. You add a card at checkout, and you are not charged if you cancel before the 7 days end. After 7 days your monthly plan bills automatically. Yearly plans have no trial and are billed right away.']
export const TRIAL_REFUND = 'With a monthly free trial, the 14 days start at your first charge (after the 7-day trial), not at signup. If you cancel during the trial you are never charged, so there is nothing to refund.'
