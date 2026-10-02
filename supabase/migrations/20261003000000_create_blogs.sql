-- Blogs table for the public /blogs section and the /admin CMS.
-- Writes happen server-side with the service role (after an admin check);
-- the public anon key can only read published posts.

create table if not exists public.blogs (
	id uuid primary key default gen_random_uuid(),
	title text not null check (char_length(title) between 1 and 200),
	slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	excerpt text check (char_length(excerpt) <= 500),
	content text not null default '',
	cover_image_url text,
	cover_image_alt text,
	meta_title text check (char_length(meta_title) <= 70),
	meta_description text check (char_length(meta_description) <= 170),
	tags text[] not null default '{}',
	status text not null default 'draft' check (status in ('draft', 'published')),
	published_at timestamptz,
	author_id uuid references auth.users (id) on delete set null,
	author_name text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists blogs_status_published_at_idx on public.blogs (status, published_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists blogs_set_updated_at on public.blogs;
create trigger blogs_set_updated_at
	before update on public.blogs
	for each row execute function public.set_updated_at();

alter table public.blogs enable row level security;

drop policy if exists "Published blogs are publicly readable" on public.blogs;
create policy "Published blogs are publicly readable"
	on public.blogs for select
	to anon, authenticated
	using (status = 'published' and published_at <= now());

grant select on public.blogs to anon, authenticated;
grant all on public.blogs to service_role;

-- Make the API see the new table immediately.
notify pgrst, 'reload schema';
