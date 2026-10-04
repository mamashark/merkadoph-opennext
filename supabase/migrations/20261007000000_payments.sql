-- Payment gateways (Stripe, PayPal, pay later) and payment tracking on orders.
-- Run after 20261006000000_shop.sql. Gateway rows are service-role only: no public policies.
-- Secret keys are stored encrypted by the app (AES-GCM, key = SETTINGS_ENCRYPTION_KEY Worker secret).

create table if not exists public.payment_gateways (
	id text primary key check (id in ('manual', 'stripe', 'paypal')),
	enabled boolean not null default false,
	mode text not null default 'test' check (mode in ('test', 'live')),
	settings jsonb not null default '{}'::jsonb,
	secrets jsonb not null default '{}'::jsonb,
	sort_order integer not null default 0,
	updated_at timestamptz not null default now()
);

insert into public.payment_gateways (id, enabled, mode, settings, sort_order) values
	('manual', false, 'live', '{"title": "Pay later", "description": "Place your order now — we''ll email you to confirm payment (Swish or bank transfer) and delivery."}'::jsonb, 0),
	('stripe', false, 'test', '{"title": "Card, Apple Pay & Google Pay", "description": "Pay securely with Stripe."}'::jsonb, 1),
	('paypal', false, 'test', '{"title": "PayPal", "description": "Pay with your PayPal account or card."}'::jsonb, 2)
on conflict (id) do nothing;

drop trigger if exists payment_gateways_set_updated_at on public.payment_gateways;
create trigger payment_gateways_set_updated_at before update on public.payment_gateways for each row execute function public.set_updated_at();

alter table public.payment_gateways enable row level security;
grant all on public.payment_gateways to service_role;

-- Orders: how the customer paid and whether the payment went through.
alter table public.orders add column if not exists payment_method text not null default 'manual';
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists stock_reserved boolean not null default false;

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check (payment_method in ('manual', 'stripe', 'paypal'));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (payment_status in ('unpaid', 'paid', 'failed', 'refunded'));

create index if not exists orders_payment_reference_idx on public.orders (payment_reference);

-- Make the API see the changes immediately.
notify pgrst, 'reload schema';
