-- Customer cancellation requests (shop-reference.md §3.3, A8 / D22).
-- Run after 20261011040000_checkout.sql. Safe to run more than once.

alter table public.orders add column if not exists cancel_requested_at timestamptz;
alter table public.orders add column if not exists cancel_reason text check (char_length(cancel_reason) <= 500);
create index if not exists orders_cancel_requested_idx on public.orders (cancel_requested_at) where cancel_requested_at is not null;

notify pgrst, 'reload schema';
