-- Cross-link: a Community Impact entry can point to the blog post that tells its story.
-- Stored once, on the entry; the blog page finds its entries with the reverse lookup (blog_id = post id).
-- Run after 20261114000000_shared_tags.sql. Safe to run more than once.
-- Applied straight to production on 2026-11-22 with Kay's OK (no staging step; additive, nullable column).
-- Rollback (removes every link):
--   drop index if exists public.portfolios_blog_id_idx;
--   alter table public.portfolios drop column if exists blog_id;

alter table public.portfolios
	add column if not exists blog_id uuid references public.blogs (id) on delete set null;

create index if not exists portfolios_blog_id_idx on public.portfolios (blog_id) where blog_id is not null;

notify pgrst, 'reload schema';
