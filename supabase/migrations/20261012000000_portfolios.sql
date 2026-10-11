-- Portfolio (projects showcase): /portfolio, /portfolio/[slug], homepage section, Admin → Portfolio.
-- Run after 20261011060000_emails_shipping_status.sql. Safe to run more than once.

create table if not exists public.portfolios (
	id uuid primary key default gen_random_uuid(),
	title text not null check (char_length(title) between 1 and 200),
	slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	excerpt text check (char_length(excerpt) <= 500),
	content text not null default '',
	cover_image_url text,
	cover_image_alt text,
	-- [{ "url": "https://…", "alt": "…", "description": "…" }, …] from the media library, in display order.
	images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 40),
	location text check (char_length(location) <= 120),
	completed_on date,
	tags text[] not null default '{}',
	meta_title text check (char_length(meta_title) <= 70),
	meta_description text check (char_length(meta_description) <= 170),
	status text not null default 'draft' check (status in ('draft', 'published')),
	published_at timestamptz,
	author_id uuid references auth.users (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists portfolios_status_published_idx on public.portfolios (status, published_at desc);
create index if not exists portfolios_tags_idx on public.portfolios using gin (tags);

drop trigger if exists portfolios_set_updated_at on public.portfolios;
create trigger portfolios_set_updated_at before update on public.portfolios for each row execute function public.set_updated_at();

-- Same rules as the other content types: the public sees published, already-live rows only.
alter table public.portfolios enable row level security;
drop policy if exists "Published rows are publicly readable" on public.portfolios;
create policy "Published rows are publicly readable" on public.portfolios for select to anon, authenticated using (status = 'published' and published_at <= now());
grant select on public.portfolios to anon, authenticated;
grant all on public.portfolios to service_role;

notify pgrst, 'reload schema';
