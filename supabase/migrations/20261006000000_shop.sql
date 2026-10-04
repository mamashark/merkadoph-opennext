-- Shop: products (WooCommerce-style), categories, tags, orders and site settings.
-- Writes go through the service role after an admin check. The anon key can read
-- live products, all categories/tags and the public shop settings. Orders are private.
-- Relies on public.set_updated_at() from 20261003000000_create_blogs.sql.

------------------------------------------------------------------------------
-- Settings (key/value). The "shop" row holds the shop on/off switch and options.
------------------------------------------------------------------------------
create table if not exists public.site_settings (
	key text primary key,
	value jsonb not null default '{}'::jsonb,
	updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value)
values ('shop', '{"enabled": false, "currency": "SEK", "title": "Shop", "description": "", "checkout_note": "", "brand": "Merkado PH", "google_product_category": ""}'::jsonb)
on conflict (key) do nothing;

------------------------------------------------------------------------------
-- Categories (hierarchical) and tags
------------------------------------------------------------------------------
create table if not exists public.product_categories (
	id uuid primary key default gen_random_uuid(),
	name text not null check (char_length(name) between 1 and 120),
	slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	parent_id uuid references public.product_categories (id) on delete set null,
	description text check (char_length(description) <= 2000),
	image_url text,
	sort_order integer not null default 0,
	meta_title text check (char_length(meta_title) <= 70),
	meta_description text check (char_length(meta_description) <= 170),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint product_categories_not_own_parent check (parent_id is null or parent_id <> id)
);

create table if not exists public.product_tags (
	id uuid primary key default gen_random_uuid(),
	name text not null check (char_length(name) between 1 and 60),
	slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	created_at timestamptz not null default now()
);

------------------------------------------------------------------------------
-- Products
------------------------------------------------------------------------------
create table if not exists public.products (
	id uuid primary key default gen_random_uuid(),
	title text not null check (char_length(title) between 1 and 200),
	slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	excerpt text check (char_length(excerpt) <= 1000),
	content text not null default '',
	sku text unique check (char_length(sku) <= 64),
	regular_price numeric(12, 2) check (regular_price >= 0),
	sale_price numeric(12, 2) check (sale_price >= 0),
	sale_starts_at timestamptz,
	sale_ends_at timestamptz,
	manage_stock boolean not null default false,
	stock_quantity integer,
	stock_status text not null default 'instock' check (stock_status in ('instock', 'outofstock', 'onbackorder')),
	weight_kg numeric(10, 3) check (weight_kg >= 0),
	length_cm numeric(10, 2) check (length_cm >= 0),
	width_cm numeric(10, 2) check (width_cm >= 0),
	height_cm numeric(10, 2) check (height_cm >= 0),
	cover_image_url text,
	cover_image_alt text,
	gallery jsonb not null default '[]'::jsonb,
	brand text check (char_length(brand) <= 80),
	gtin text check (char_length(gtin) <= 20),
	mpn text check (char_length(mpn) <= 70),
	condition text not null default 'new' check (condition in ('new', 'refurbished', 'used')),
	is_featured boolean not null default false,
	sort_order integer not null default 0,
	meta_title text check (char_length(meta_title) <= 70),
	meta_description text check (char_length(meta_description) <= 170),
	status text not null default 'draft' check (status in ('draft', 'published')),
	published_at timestamptz,
	author_id uuid references auth.users (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint products_sale_below_regular check (sale_price is null or regular_price is null or sale_price <= regular_price),
	constraint products_sale_window check (sale_ends_at is null or sale_starts_at is null or sale_ends_at >= sale_starts_at)
);

create index if not exists products_status_published_idx on public.products (status, published_at desc);

-- Many-to-many: a product can be in several categories and have several tags.
create table if not exists public.product_category_map (
	product_id uuid not null references public.products (id) on delete cascade,
	category_id uuid not null references public.product_categories (id) on delete cascade,
	primary key (product_id, category_id)
);
create index if not exists product_category_map_category_idx on public.product_category_map (category_id);

create table if not exists public.product_tag_map (
	product_id uuid not null references public.products (id) on delete cascade,
	tag_id uuid not null references public.product_tags (id) on delete cascade,
	primary key (product_id, tag_id)
);
create index if not exists product_tag_map_tag_idx on public.product_tag_map (tag_id);

------------------------------------------------------------------------------
-- Orders (checkout = order request; payment arranged after confirmation)
------------------------------------------------------------------------------
create table if not exists public.orders (
	id uuid primary key default gen_random_uuid(),
	order_number bigint generated always as identity (start with 1001) unique,
	status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'cancelled')),
	customer_name text not null check (char_length(customer_name) between 1 and 120),
	email text not null check (char_length(email) between 3 and 254),
	phone text check (char_length(phone) <= 40),
	address_line1 text check (char_length(address_line1) <= 200),
	address_line2 text check (char_length(address_line2) <= 200),
	postal_code text check (char_length(postal_code) <= 20),
	city text check (char_length(city) <= 100),
	country text not null default 'SE' check (char_length(country) <= 2),
	notes text check (char_length(notes) <= 2000),
	items jsonb not null default '[]'::jsonb,
	subtotal numeric(12, 2) not null default 0,
	currency text not null default 'SEK',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);

------------------------------------------------------------------------------
-- Ops log: also record product feed regenerations
------------------------------------------------------------------------------
alter table public.ops_logs drop constraint if exists ops_logs_kind_check;
alter table public.ops_logs add constraint ops_logs_kind_check check (kind in ('keepalive', 'cache_purge', 'product_feed'));

------------------------------------------------------------------------------
-- Triggers, RLS, grants
------------------------------------------------------------------------------
do $$
declare
	t text;
begin
	foreach t in array array['products', 'product_categories', 'orders', 'site_settings'] loop
		execute format('drop trigger if exists %1$s_set_updated_at on public.%1$s', t);
		execute format('create trigger %1$s_set_updated_at before update on public.%1$s for each row execute function public.set_updated_at()', t);
	end loop;
end;
$$;

alter table public.site_settings enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_tags enable row level security;
alter table public.products enable row level security;
alter table public.product_category_map enable row level security;
alter table public.product_tag_map enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Shop settings are public" on public.site_settings;
create policy "Shop settings are public" on public.site_settings for select to anon, authenticated using (key = 'shop');

drop policy if exists "Categories are public" on public.product_categories;
create policy "Categories are public" on public.product_categories for select to anon, authenticated using (true);

drop policy if exists "Tags are public" on public.product_tags;
create policy "Tags are public" on public.product_tags for select to anon, authenticated using (true);

drop policy if exists "Live products are public" on public.products;
create policy "Live products are public" on public.products for select to anon, authenticated using (status = 'published' and published_at <= now());

drop policy if exists "Category links of live products are public" on public.product_category_map;
create policy "Category links of live products are public" on public.product_category_map for select to anon, authenticated
	using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published' and p.published_at <= now()));

drop policy if exists "Tag links of live products are public" on public.product_tag_map;
create policy "Tag links of live products are public" on public.product_tag_map for select to anon, authenticated
	using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published' and p.published_at <= now()));

grant select on public.site_settings, public.product_categories, public.product_tags, public.products, public.product_category_map, public.product_tag_map to anon, authenticated;
grant all on public.site_settings, public.product_categories, public.product_tags, public.products, public.product_category_map, public.product_tag_map, public.orders to service_role;

-- Make the API see the new tables immediately.
notify pgrst, 'reload schema';
