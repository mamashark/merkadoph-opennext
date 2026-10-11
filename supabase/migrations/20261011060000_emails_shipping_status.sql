-- Transactional emails + "shipped" orders (shop-reference.md §5.4, §8, A9).
-- Run after 20261011050000_order_cancellation.sql. Safe to run more than once.

------------------------------------------------------------------------------
-- Email log (support/debugging). Service role only; purged after 180 days by the cron.
------------------------------------------------------------------------------
create table if not exists public.email_log (
	id bigint generated always as identity primary key,
	template text not null check (char_length(template) <= 60),
	to_email text not null check (char_length(to_email) <= 254),
	subject text not null check (char_length(subject) <= 300),
	status text not null check (status in ('sent', 'failed', 'skipped')),
	provider_id text check (char_length(provider_id) <= 120),
	error text check (char_length(error) <= 500),
	order_id uuid references public.orders (id) on delete set null,
	created_at timestamptz not null default now()
);
create index if not exists email_log_created_idx on public.email_log (created_at desc);
create index if not exists email_log_order_idx on public.email_log (order_id);
alter table public.email_log enable row level security;
revoke all on public.email_log from anon, authenticated;
grant all on public.email_log to service_role;

------------------------------------------------------------------------------
-- Orders: "shipped" status + tracking
------------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('pending', 'processing', 'shipped', 'completed', 'cancelled'));
alter table public.orders add column if not exists carrier text check (char_length(carrier) <= 60);
alter table public.orders add column if not exists tracking_number text check (char_length(tracking_number) <= 100);
alter table public.orders add column if not exists tracking_url text check (char_length(tracking_url) <= 500);
alter table public.orders add column if not exists shipped_at timestamptz;

notify pgrst, 'reload schema';
