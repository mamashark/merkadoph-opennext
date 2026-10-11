-- Shipping methods and VAT configuration (shop-reference.md §5, §6, A6).
-- Run after 20261011020000_customer_addresses.sql. Safe to run more than once.

------------------------------------------------------------------------------
-- VAT classes (Admin → Shop → Tax). Rates are public information.
------------------------------------------------------------------------------
create table if not exists public.tax_classes (
	id text primary key check (id ~ '^[a-z0-9-]{1,30}$'),
	name text not null check (char_length(name) between 1 and 60),
	rate numeric(5, 2) not null check (rate >= 0 and rate <= 100),
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
drop trigger if exists tax_classes_set_updated_at on public.tax_classes;
create trigger tax_classes_set_updated_at before update on public.tax_classes for each row execute function public.set_updated_at();

insert into public.tax_classes (id, name, rate, sort_order) values
	('standard', 'Standard (25%)', 25, 0),
	('food', 'Food (12%)', 12, 1),
	('reduced', 'Books & culture (6%)', 6, 2),
	('zero', 'Zero rate (0%)', 0, 3)
on conflict (id) do nothing;

alter table public.tax_classes enable row level security;
drop policy if exists "Tax classes are public" on public.tax_classes;
create policy "Tax classes are public" on public.tax_classes for select to anon, authenticated using (true);
grant select on public.tax_classes to anon, authenticated;
grant all on public.tax_classes to service_role;

-- Each product picks a class; null = the default class from the tax settings.
alter table public.products add column if not exists tax_class text references public.tax_classes (id) on update cascade on delete set null;

-- VAT switch: off until the business is VAT-registered. Prices are entered including VAT.
insert into public.site_settings (key, value) values ('tax', '{"enabled": false, "default_class": "standard"}'::jsonb)
on conflict (key) do nothing;
drop policy if exists "Public site settings" on public.site_settings;
create policy "Public site settings" on public.site_settings for select to anon, authenticated using (key in ('shop', 'seo', 'legal', 'tax'));

------------------------------------------------------------------------------
-- Shipping methods (Admin → Shop → Shipping). Sweden only for now (D14).
------------------------------------------------------------------------------
create table if not exists public.shipping_methods (
	id uuid primary key default gen_random_uuid(),
	type text not null check (type in ('flat_rate', 'weight_based', 'local_delivery', 'pickup')),
	title text not null check (char_length(title) between 1 and 80),
	description text check (char_length(description) <= 300),
	price numeric(10, 2) not null default 0 check (price >= 0),
	-- Free when the order's goods total (incl. VAT) reaches this amount. Null = never free.
	free_over numeric(10, 2) check (free_over >= 0),
	-- weight_based: [{ "max_kg": 5, "price": 79 }, …] sorted by max_kg.
	weight_bands jsonb not null default '[]'::jsonb check (jsonb_typeof(weight_bands) = 'array'),
	-- local_delivery: postcode prefixes, e.g. {"111","112","12345"}.
	postcodes text[] not null default '{}',
	-- pickup: where to collect (shown at checkout and in emails).
	pickup_address text check (char_length(pickup_address) <= 300),
	enabled boolean not null default true,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists shipping_methods_enabled_idx on public.shipping_methods (enabled, sort_order);
drop trigger if exists shipping_methods_set_updated_at on public.shipping_methods;
create trigger shipping_methods_set_updated_at before update on public.shipping_methods for each row execute function public.set_updated_at();

alter table public.shipping_methods enable row level security;
drop policy if exists "Enabled shipping methods are public" on public.shipping_methods;
create policy "Enabled shipping methods are public" on public.shipping_methods for select to anon, authenticated using (enabled);
grant select on public.shipping_methods to anon, authenticated;
grant all on public.shipping_methods to service_role;

notify pgrst, 'reload schema';
