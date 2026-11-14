-- Grants baseline for the public schema (security.md: least privilege, RLS everywhere).
-- Run after 20261012000000_portfolios.sql. Safe to run more than once. Runs as one transaction.
--
-- Model
-- - service_role (server only, never shipped to browsers): full access to every table, sequence and function.
-- - anon / authenticated (the browser-safe keys): NOTHING unless a table is listed below. Each listed
--   table also has RLS on and policies that decide which rows are visible.
-- - New tables, sequences and functions start locked: service_role only. Exposing one to the Data API
--   takes an explicit grant + RLS policy in its own migration (same pattern as 20261012000000_portfolios.sql).
--
-- Why: Supabase's stock defaults grant ALL on every new public table to anon and authenticated, so a
-- table created without RLS (e.g. in the dashboard) is readable and writable with the public key.
-- This file removes that default and resets existing tables to exactly what the app uses.

begin;

/* ------------------------------------------------------------------ */
/* 1. Future objects created by the postgres role (migrations, SQL editor, dashboard)                 */
/* ------------------------------------------------------------------ */

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public grant all on tables to service_role;

alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public grant usage, select, update on sequences to service_role;

-- EXECUTE goes to PUBLIC by default for every new function. That global default can only be removed
-- without "in schema", so this applies to functions postgres creates in any schema.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
alter default privileges for role postgres in schema public grant execute on functions to service_role;

/* ------------------------------------------------------------------ */
/* 2. Existing tables: reset, then grant only what the app uses       */
/* ------------------------------------------------------------------ */

-- Fail closed: any table not listed below (including ones made outside migrations) loses public access.
revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;

-- Public website content (RLS: published / enabled rows only).
grant select on
	public.blogs,
	public.events,
	public.promotions,
	public.services,
	public.portfolios,
	public.redirects,
	public.site_settings,
	public.products,
	public.product_categories,
	public.product_tags,
	public.product_category_map,
	public.product_tag_map,
	public.tax_classes,
	public.shipping_methods
to anon, authenticated;

-- Signed-in shoppers, own rows only (RLS: id / customer_id = auth.uid()).
grant select on public.customer_profiles to authenticated;
grant update (first_name, last_name, phone, marketing_opt_in, marketing_opt_in_at) on public.customer_profiles to authenticated;
grant select, insert, update, delete on public.customer_addresses to authenticated;
grant select on public.orders to authenticated;

-- Server only (service_role): ops_logs, contact_messages, payment_gateways, audit_logs, carts,
-- cart_items, wishlist_items, email_log. No grants to anon / authenticated.

/* ------------------------------------------------------------------ */
/* 3. Sequences (identity columns): only the server inserts rows      */
/* ------------------------------------------------------------------ */

revoke all on all sequences in schema public from anon, authenticated;
grant usage, select, update on all sequences in schema public to service_role;

/* ------------------------------------------------------------------ */
/* 4. Functions                                                        */
/* ------------------------------------------------------------------ */

-- Listed one by one (not "all functions") so extension functions installed in public are untouched.
revoke all on function
	public.set_updated_at(),
	public.customer_addresses_limit(),
	public.redirect_hit(text),
	public.decrement_stock(uuid, integer),
	public.cart_open(uuid, text, text),
	public.cart_set_item(uuid, uuid, integer, text, integer, numeric),
	public.cart_merge(uuid, uuid),
	public.reserve_order_stock(uuid),
	public.release_order_stock(uuid)
from public, anon, authenticated;

grant execute on function
	public.set_updated_at(),
	public.customer_addresses_limit(),
	public.redirect_hit(text),
	public.decrement_stock(uuid, integer),
	public.cart_open(uuid, text, text),
	public.cart_set_item(uuid, uuid, integer, text, integer, numeric),
	public.cart_merge(uuid, uuid),
	public.reserve_order_stock(uuid),
	public.release_order_stock(uuid)
to service_role;

-- The proxy counts redirect hits with the public key (src/lib/redirect-lookup.ts).
grant execute on function public.redirect_hit(text) to anon, authenticated;

/* ------------------------------------------------------------------ */
/* 5. RLS guard: abort if anything reachable by the public keys is unprotected                        */
/* ------------------------------------------------------------------ */

do $$
declare
	missing text;
	unpoliced text;
begin
	-- Every table in public must have RLS on, granted or not (defense in depth if a grant is added later).
	select string_agg(c.relname, ', ' order by c.relname) into missing
	from pg_class c
	join pg_namespace n on n.oid = c.relnamespace
	where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity;
	if missing is not null then
		raise exception 'RLS is disabled on public tables: %. Enable it (alter table … enable row level security) and re-run.', missing;
	end if;

	-- Tables anon/authenticated can touch but with no policy return nothing; flag them so it's deliberate.
	select string_agg(distinct c.relname, ', ') into unpoliced
	from pg_class c
	join pg_namespace n on n.oid = c.relnamespace
	where n.nspname = 'public' and c.relkind in ('r', 'p')
		and (has_table_privilege('anon', c.oid, 'select,insert,update,delete') or has_table_privilege('authenticated', c.oid, 'select,insert,update,delete'))
		and not exists (select 1 from pg_policy p where p.polrelid = c.oid);
	if unpoliced is not null then
		raise warning 'Granted to anon/authenticated but no RLS policy (every query returns no rows): %', unpoliced;
	end if;
end
$$;

commit;

notify pgrst, 'reload schema';
