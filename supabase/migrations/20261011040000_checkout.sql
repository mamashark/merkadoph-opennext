-- Checkout v2 (shop-reference.md §15.3–15.4, A7): order totals with shipping + VAT, account links,
-- private order links, idempotent placement and atomic stock holds.
-- Run after 20261011030000_shipping_tax.sql. Safe to run more than once.

------------------------------------------------------------------------------
-- Orders: new columns
------------------------------------------------------------------------------
alter table public.orders add column if not exists customer_id uuid references auth.users (id) on delete set null;
alter table public.orders add column if not exists access_token uuid not null default gen_random_uuid();
alter table public.orders add column if not exists cart_id uuid references public.carts (id) on delete set null;
alter table public.orders add column if not exists idempotency_key text;
alter table public.orders add column if not exists shipping_address jsonb;
alter table public.orders add column if not exists billing_address jsonb;
alter table public.orders add column if not exists shipping_method jsonb;
alter table public.orders add column if not exists shipping_total numeric(12, 2) not null default 0;
alter table public.orders add column if not exists tax_total numeric(12, 2) not null default 0;
alter table public.orders add column if not exists tax_breakdown jsonb;
alter table public.orders add column if not exists discount_total numeric(12, 2) not null default 0;
alter table public.orders add column if not exists total numeric(12, 2);
alter table public.orders add column if not exists terms_accepted_at timestamptz;
alter table public.orders add column if not exists reserved_until timestamptz;

-- Older orders: total = subtotal.
update public.orders set total = subtotal where total is null;

create unique index if not exists orders_idempotency_key_idx on public.orders (idempotency_key) where idempotency_key is not null;
create index if not exists orders_customer_created_idx on public.orders (customer_id, created_at desc);
create index if not exists orders_email_lower_idx on public.orders (lower(email));
create index if not exists orders_holds_idx on public.orders (reserved_until) where stock_reserved and payment_status = 'unpaid';

-- Customers can read their own orders (account area). Everything else stays service-role only.
alter table public.orders enable row level security;
drop policy if exists "Customers read own orders" on public.orders;
create policy "Customers read own orders" on public.orders for select to authenticated using (customer_id = (select auth.uid()));
grant select on public.orders to authenticated;

------------------------------------------------------------------------------
-- Stock holds (server / service role only)
------------------------------------------------------------------------------

-- Takes stock for every tracked product in the order, all or nothing. Raises 'insufficient_stock'
-- (and changes nothing) if any line can't be covered. Idempotent via orders.stock_reserved.
create or replace function public.reserve_order_stock(p_order uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
	v_item record;
	v_updated integer;
begin
	update public.orders set stock_reserved = true where id = p_order and not stock_reserved;
	if not found then
		return false; -- already reserved (or no such order)
	end if;
	for v_item in
		select (i ->> 'product_id')::uuid as product_id, sum((i ->> 'quantity')::integer) as qty
		from public.orders o, jsonb_array_elements(o.items) i
		where o.id = p_order
		group by 1
	loop
		update public.products
		set stock_quantity = stock_quantity - v_item.qty
		where id = v_item.product_id and manage_stock and stock_status <> 'onbackorder' and coalesce(stock_quantity, 0) >= v_item.qty;
		get diagnostics v_updated = row_count;
		if v_updated = 0 and exists (select 1 from public.products where id = v_item.product_id and manage_stock and stock_status <> 'onbackorder') then
			raise exception 'insufficient_stock' using errcode = 'P0001';
		end if;
	end loop;
	return true;
end;
$$;

-- Gives the stock of an order back (cancelled / payment expired). Idempotent.
create or replace function public.release_order_stock(p_order uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
	v_item record;
begin
	update public.orders set stock_reserved = false, reserved_until = null where id = p_order and stock_reserved;
	if not found then
		return false;
	end if;
	for v_item in
		select (i ->> 'product_id')::uuid as product_id, sum((i ->> 'quantity')::integer) as qty
		from public.orders o, jsonb_array_elements(o.items) i
		where o.id = p_order
		group by 1
	loop
		update public.products
		set stock_quantity = coalesce(stock_quantity, 0) + v_item.qty
		where id = v_item.product_id and manage_stock and stock_status <> 'onbackorder';
	end loop;
	return true;
end;
$$;

revoke all on function public.reserve_order_stock(uuid) from public, anon, authenticated;
revoke all on function public.release_order_stock(uuid) from public, anon, authenticated;
grant execute on function public.reserve_order_stock(uuid) to service_role;
grant execute on function public.release_order_stock(uuid) to service_role;

notify pgrst, 'reload schema';
