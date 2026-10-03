-- Events, promotions and services for the public site and the /admin CMS.
-- Same model as blogs: writes go through the service role after an admin check,
-- the anon key can only read rows that are published and whose publish date has passed.
-- Relies on public.set_updated_at() from 20261003000000_create_blogs.sql.

-- Blogs: published_at is now set from the editor (it may be in the future = scheduled).
comment on column public.blogs.published_at is 'Publish date. A published post stays hidden until this time (scheduled).';
comment on column public.blogs.author_name is 'Byline shown on the post. Free text, editable in the admin.';

------------------------------------------------------------------------------
-- Events
------------------------------------------------------------------------------
create table if not exists public.events (
	id uuid primary key default gen_random_uuid(),
	title text not null check (char_length(title) between 1 and 200),
	slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	excerpt text check (char_length(excerpt) <= 500),
	content text not null default '',
	cover_image_url text,
	cover_image_alt text,
	tags text[] not null default '{}',
	starts_at timestamptz not null,
	ends_at timestamptz,
	venue_name text check (char_length(venue_name) <= 200),
	venue_address text check (char_length(venue_address) <= 300),
	map_url text,
	organizer text check (char_length(organizer) <= 120),
	price_info text check (char_length(price_info) <= 120),
	registration_url text,
	meta_title text check (char_length(meta_title) <= 70),
	meta_description text check (char_length(meta_description) <= 170),
	status text not null default 'draft' check (status in ('draft', 'published')),
	published_at timestamptz,
	author_id uuid references auth.users (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint events_dates_check check (ends_at is null or ends_at >= starts_at)
);

create index if not exists events_status_starts_at_idx on public.events (status, starts_at);

------------------------------------------------------------------------------
-- Promotions
------------------------------------------------------------------------------
create table if not exists public.promotions (
	id uuid primary key default gen_random_uuid(),
	title text not null check (char_length(title) between 1 and 200),
	slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	excerpt text check (char_length(excerpt) <= 500),
	content text not null default '',
	cover_image_url text,
	cover_image_alt text,
	tags text[] not null default '{}',
	discount_label text check (char_length(discount_label) <= 40),
	promo_code text check (char_length(promo_code) <= 40),
	starts_at timestamptz,
	ends_at timestamptz,
	terms text check (char_length(terms) <= 4000),
	cta_label text check (char_length(cta_label) <= 40),
	cta_url text,
	meta_title text check (char_length(meta_title) <= 70),
	meta_description text check (char_length(meta_description) <= 170),
	status text not null default 'draft' check (status in ('draft', 'published')),
	published_at timestamptz,
	author_id uuid references auth.users (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint promotions_dates_check check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create index if not exists promotions_status_ends_at_idx on public.promotions (status, ends_at);

------------------------------------------------------------------------------
-- Services
------------------------------------------------------------------------------
create table if not exists public.services (
	id uuid primary key default gen_random_uuid(),
	title text not null check (char_length(title) between 1 and 200),
	slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	excerpt text check (char_length(excerpt) <= 500),
	content text not null default '',
	cover_image_url text,
	cover_image_alt text,
	tags text[] not null default '{}',
	category text check (char_length(category) <= 60),
	price_label text check (char_length(price_label) <= 80),
	cta_label text check (char_length(cta_label) <= 40),
	cta_url text,
	is_featured boolean not null default false,
	sort_order integer not null default 0,
	meta_title text check (char_length(meta_title) <= 70),
	meta_description text check (char_length(meta_description) <= 170),
	status text not null default 'draft' check (status in ('draft', 'published')),
	published_at timestamptz,
	author_id uuid references auth.users (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists services_status_order_idx on public.services (status, is_featured desc, sort_order, title);

------------------------------------------------------------------------------
-- Shared: updated_at triggers, RLS, grants
------------------------------------------------------------------------------
do $$
declare
	t text;
begin
	foreach t in array array['events', 'promotions', 'services'] loop
		execute format('drop trigger if exists %1$s_set_updated_at on public.%1$s', t);
		execute format('create trigger %1$s_set_updated_at before update on public.%1$s for each row execute function public.set_updated_at()', t);

		execute format('alter table public.%s enable row level security', t);
		execute format('drop policy if exists "Published rows are publicly readable" on public.%s', t);
		execute format(
			'create policy "Published rows are publicly readable" on public.%s for select to anon, authenticated using (status = ''published'' and published_at <= now())',
			t
		);

		execute format('grant select on public.%s to anon, authenticated', t);
		execute format('grant all on public.%s to service_role', t);
	end loop;
end;
$$;

-- Make the API see the new tables immediately.
notify pgrst, 'reload schema';
