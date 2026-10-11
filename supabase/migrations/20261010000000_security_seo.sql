-- Security + SEO foundations: audit log, redirects, public SEO/legal settings, atomic stock.
-- Run after 20261007000000_payments.sql. Safe to run more than once.

------------------------------------------------------------------------------
-- Audit log (admin changes + security events). Service role only.
------------------------------------------------------------------------------
create table if not exists public.audit_logs (
	id bigint generated always as identity primary key,
	kind text not null check (kind in ('admin', 'security')),
	action text not null check (char_length(action) between 1 and 80),
	actor_id uuid,
	actor_email text,
	entity text check (char_length(entity) <= 60),
	entity_id text check (char_length(entity_id) <= 120),
	summary text check (char_length(summary) <= 500),
	details jsonb,
	ip text,
	user_agent text check (char_length(user_agent) <= 300),
	created_at timestamptz not null default now()
);
create index if not exists audit_logs_kind_created_idx on public.audit_logs (kind, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action);
alter table public.audit_logs enable row level security;
grant all on public.audit_logs to service_role;

------------------------------------------------------------------------------
-- Redirects (301s for changed slugs and old URLs). Public read so the proxy can apply them.
------------------------------------------------------------------------------
create table if not exists public.redirects (
	id uuid primary key default gen_random_uuid(),
	from_path text not null unique check (from_path ~ '^/[^?#\s]*$' and char_length(from_path) <= 500),
	to_path text not null check (char_length(to_path) between 1 and 1000),
	status integer not null default 301 check (status in (301, 302, 307, 308)),
	source text not null default 'manual' check (source in ('manual', 'auto')),
	note text check (char_length(note) <= 300),
	hits integer not null default 0,
	last_hit_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint redirects_not_self check (from_path <> to_path)
);

drop trigger if exists redirects_set_updated_at on public.redirects;
create trigger redirects_set_updated_at before update on public.redirects for each row execute function public.set_updated_at();

alter table public.redirects enable row level security;
drop policy if exists "Redirects are public" on public.redirects;
create policy "Redirects are public" on public.redirects for select to anon, authenticated using (true);
grant select on public.redirects to anon, authenticated;
grant all on public.redirects to service_role;

-- Hit counter callable by the proxy (anon) without giving anon write access to the table.
create or replace function public.redirect_hit(p_from text)
returns void
language sql
security definer
set search_path = ''
as $$
	update public.redirects set hits = hits + 1, last_hit_at = now() where from_path = p_from;
$$;
revoke all on function public.redirect_hit(text) from public;
grant execute on function public.redirect_hit(text) to anon, authenticated, service_role;

------------------------------------------------------------------------------
-- Public site settings: shop + SEO + legal pages are readable by everyone.
------------------------------------------------------------------------------
insert into public.site_settings (key, value) values
	('seo', '{}'::jsonb),
	('legal', '{}'::jsonb)
on conflict (key) do nothing;

drop policy if exists "Shop settings are public" on public.site_settings;
drop policy if exists "Public site settings" on public.site_settings;
create policy "Public site settings" on public.site_settings for select to anon, authenticated using (key in ('shop', 'seo', 'legal'));

------------------------------------------------------------------------------
-- Atomic stock decrement (no read-then-write race). Server (service role) only.
------------------------------------------------------------------------------
create or replace function public.decrement_stock(p_product_id uuid, p_qty integer)
returns integer
language sql
security definer
set search_path = ''
as $$
	update public.products
	set stock_quantity = greatest(coalesce(stock_quantity, 0) - p_qty, 0)
	where id = p_product_id and manage_stock and stock_status <> 'onbackorder' and p_qty > 0
	returning stock_quantity;
$$;
revoke all on function public.decrement_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_stock(uuid, integer) to service_role;

notify pgrst, 'reload schema';
