-- Booking emails: additive columns only.
-- booker_tz: booker's time zone for emails. confirmation_sent_at / cancel_notice_sent_at: claimed before sending so each email goes out at most once.
alter table public.bk_bookings add column if not exists booker_tz text check (booker_tz is null or char_length(booker_tz) <= 64);
alter table public.bk_bookings add column if not exists confirmation_sent_at timestamptz;
alter table public.bk_bookings add column if not exists cancel_notice_sent_at timestamptz;
