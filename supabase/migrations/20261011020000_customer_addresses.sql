-- Customer address book (shop-reference.md §3.4, A5). Sweden only for now (D14).
-- Run after 20261011010000_carts_wishlists.sql. Safe to run more than once.
-- Customers manage their own rows through their session (RLS by auth.uid()).

create table if not exists public.customer_addresses (
	id uuid primary key default gen_random_uuid(),
	customer_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	label text check (char_length(label) <= 40),
	first_name text not null check (char_length(first_name) between 1 and 60),
	last_name text not null check (char_length(last_name) between 1 and 60),
	company text check (char_length(company) <= 120),
	org_number text check (org_number ~ '^\d{6}-\d{4}$'),
	care_of text check (char_length(care_of) <= 100),
	line1 text not null check (char_length(line1) between 1 and 200),
	line2 text check (char_length(line2) <= 200),
	postal_code text not null check (postal_code ~ '^\d{3} \d{2}$'),
	city text not null check (char_length(city) between 1 and 100),
	country text not null default 'SE' check (country in ('SE')),
	phone text not null check (char_length(phone) between 6 and 40),
	is_default_shipping boolean not null default false,
	is_default_billing boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists customer_addresses_customer_idx on public.customer_addresses (customer_id);
-- At most one default of each kind per customer.
create unique index if not exists customer_addresses_default_shipping_idx on public.customer_addresses (customer_id) where is_default_shipping;
create unique index if not exists customer_addresses_default_billing_idx on public.customer_addresses (customer_id) where is_default_billing;

drop trigger if exists customer_addresses_set_updated_at on public.customer_addresses;
create trigger customer_addresses_set_updated_at before update on public.customer_addresses for each row execute function public.set_updated_at();

-- Hard cap of 10 addresses per customer (also checked in the app).
create or replace function public.customer_addresses_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	if (select count(*) from public.customer_addresses where customer_id = new.customer_id) >= 10 then
		raise exception 'address limit reached' using errcode = 'P0001';
	end if;
	return new;
end;
$$;
drop trigger if exists customer_addresses_limit on public.customer_addresses;
create trigger customer_addresses_limit before insert on public.customer_addresses for each row execute function public.customer_addresses_limit();

alter table public.customer_addresses enable row level security;
drop policy if exists "Customers manage own addresses" on public.customer_addresses;
create policy "Customers manage own addresses" on public.customer_addresses for all to authenticated
	using (customer_id = (select auth.uid()))
	with check (customer_id = (select auth.uid()));

revoke all on public.customer_addresses from anon, authenticated;
grant select, insert, update, delete on public.customer_addresses to authenticated;
grant all on public.customer_addresses to service_role;

notify pgrst, 'reload schema';
