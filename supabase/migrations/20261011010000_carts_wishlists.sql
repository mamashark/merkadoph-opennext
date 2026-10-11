-- Server-side carts and wishlists for guests and customers (shop-reference.md §14–15, A3/A4).
-- Run after 20261011000000_customer_profiles.sql. Safe to run more than once.
-- Access is decided in the app by ShopperContext (guest cookie token or signed-in customer),
-- so these tables are service-role only: no anon/authenticated policies.

------------------------------------------------------------------------------
-- Carts
------------------------------------------------------------------------------
create table if not exists public.carts (
	id uuid primary key default gen_random_uuid(),
	customer_id uuid references auth.users (id) on delete cascade,
	guest_token_hash text check (guest_token_hash ~ '^[0-9a-f]{64}$'),
	status text not null default 'active' check (status in ('active', 'converted', 'merged', 'abandoned')),
	email text check (char_length(email) <= 254),
	reminder_consent boolean not null default false,
	currency text not null default 'SEK',
	version integer not null default 0,
	last_activity_at timestamptz not null default now(),
	reminder_sent_at timestamptz,
	reminder_count integer not null default 0,
	recovered_at timestamptz,
	converted_order_id uuid references public.orders (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	-- Exactly one owner: a customer or a guest device.
	constraint carts_one_owner check ((customer_id is null) <> (guest_token_hash is null))
);
create unique index if not exists carts_active_customer_idx on public.carts (customer_id) where status = 'active' and customer_id is not null;
create unique index if not exists carts_active_guest_idx on public.carts (guest_token_hash) where status = 'active' and guest_token_hash is not null;
create index if not exists carts_status_activity_idx on public.carts (status, last_activity_at);

drop trigger if exists carts_set_updated_at on public.carts;
create trigger carts_set_updated_at before update on public.carts for each row execute function public.set_updated_at();

create table if not exists public.cart_items (
	cart_id uuid not null references public.carts (id) on delete cascade,
	product_id uuid not null references public.products (id) on delete cascade,
	quantity integer not null check (quantity between 1 and 99),
	price_at_add numeric(12, 2),
	added_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	primary key (cart_id, product_id)
);
create index if not exists cart_items_product_idx on public.cart_items (product_id);

alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
revoke all on public.carts, public.cart_items from anon, authenticated;
grant all on public.carts, public.cart_items to service_role;

------------------------------------------------------------------------------
-- Wishlists
------------------------------------------------------------------------------
create table if not exists public.wishlist_items (
	id bigint generated always as identity primary key,
	customer_id uuid references auth.users (id) on delete cascade,
	guest_token_hash text check (guest_token_hash ~ '^[0-9a-f]{64}$'),
	product_id uuid not null references public.products (id) on delete cascade,
	created_at timestamptz not null default now(),
	constraint wishlist_one_owner check ((customer_id is null) <> (guest_token_hash is null))
);
create unique index if not exists wishlist_customer_product_idx on public.wishlist_items (customer_id, product_id) where customer_id is not null;
create unique index if not exists wishlist_guest_product_idx on public.wishlist_items (guest_token_hash, product_id) where guest_token_hash is not null;

alter table public.wishlist_items enable row level security;
revoke all on public.wishlist_items from anon, authenticated;
grant all on public.wishlist_items to service_role;

------------------------------------------------------------------------------
-- Atomic cart operations (server / service role only)
------------------------------------------------------------------------------

-- Returns the owner's active cart, creating it if needed (race-safe via the partial unique indexes).
create or replace function public.cart_open(p_customer uuid, p_guest text, p_currency text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
	v_id uuid;
begin
	if (p_customer is null) = (p_guest is null) then
		raise exception 'cart_open: exactly one owner required';
	end if;
	loop
		select id into v_id from public.carts
		where status = 'active'
			and ((p_customer is not null and customer_id = p_customer) or (p_guest is not null and guest_token_hash = p_guest))
		limit 1;
		if v_id is not null then
			return v_id;
		end if;
		begin
			insert into public.carts (customer_id, guest_token_hash, currency)
			values (p_customer, p_guest, coalesce(p_currency, 'SEK'))
			returning id into v_id;
			return v_id;
		exception when unique_violation then
			-- Another request created it at the same moment: loop and read it.
		end;
	end loop;
end;
$$;

-- Adds to (p_mode = 'add') or sets (p_mode = 'set') a line's quantity, capped at p_max (1–99).
-- A resulting quantity < 1 removes the line. Returns the new quantity (0 = removed).
create or replace function public.cart_set_item(p_cart uuid, p_product uuid, p_qty integer, p_mode text, p_max integer, p_price numeric)
returns integer
language plpgsql
set search_path = ''
as $$
declare
	v_cap integer := least(greatest(coalesce(p_max, 99), 0), 99);
	v_qty integer;
begin
	if p_mode = 'add' then
		select least(coalesce((select quantity from public.cart_items where cart_id = p_cart and product_id = p_product), 0) + p_qty, v_cap) into v_qty;
	else
		v_qty := least(p_qty, v_cap);
	end if;

	if v_qty < 1 then
		delete from public.cart_items where cart_id = p_cart and product_id = p_product;
		v_qty := 0;
	else
		insert into public.cart_items (cart_id, product_id, quantity, price_at_add)
		values (p_cart, p_product, v_qty, p_price)
		on conflict (cart_id, product_id) do update
			set quantity = excluded.quantity, updated_at = now();
	end if;

	update public.carts set version = version + 1, last_activity_at = now() where id = p_cart;
	return v_qty;
end;
$$;

-- Moves every line of p_from into p_into (same product: quantities added, max 99), marks p_from merged.
create or replace function public.cart_merge(p_from uuid, p_into uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
	if p_from = p_into then
		return;
	end if;
	insert into public.cart_items (cart_id, product_id, quantity, price_at_add, added_at)
	select p_into, product_id, quantity, price_at_add, added_at from public.cart_items where cart_id = p_from
	on conflict (cart_id, product_id) do update
		set quantity = least(public.cart_items.quantity + excluded.quantity, 99), updated_at = now();
	delete from public.cart_items where cart_id = p_from;
	update public.carts set status = 'merged', last_activity_at = now() where id = p_from;
	update public.carts set version = version + 1, last_activity_at = now() where id = p_into;
end;
$$;

revoke all on function public.cart_open(uuid, text, text) from public, anon, authenticated;
revoke all on function public.cart_set_item(uuid, uuid, integer, text, integer, numeric) from public, anon, authenticated;
revoke all on function public.cart_merge(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cart_open(uuid, text, text) to service_role;
grant execute on function public.cart_set_item(uuid, uuid, integer, text, integer, numeric) to service_role;
grant execute on function public.cart_merge(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
