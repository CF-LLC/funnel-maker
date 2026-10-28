-- Fix: Postgres regex repetition counts max out at 255, so the original payment_link check ({1,300}) rejected every link.
-- Same rule, length enforced separately. dl_products was created empty in 20261028a and holds no rows yet.
alter table public.dl_products drop constraint if exists dl_products_payment_link_check;
alter table public.dl_products add constraint dl_products_payment_link_check check (
  payment_link is null or (length(payment_link) <= 330 and payment_link ~ '^https://(buy\.stripe\.com|checkout\.stripe\.com)/[A-Za-z0-9/_?=&%.-]+$')
);
