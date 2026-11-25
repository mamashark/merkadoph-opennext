-- Bulletin Board + Press & Media (Kay's spec, 2026-11-25), Phase 1: content model.
-- Revised after Arvid's and Sig's reviews (both "changes requested"; all findings folded in).
--
-- One record per notice/feature (spec §5.1): the same row can appear on the homepage, /bulletin and /press.
-- Replaces the old "blog posts tagged Announcement" mechanism (0 such posts existed). Community Offers stay in
-- public.promotions (Kay, 2026-11-25) and are merged into the Bulletin Board in the data layer, so there is no
-- 'community_offer' content type here; the 'community-offers' category slug is reserved for that filter.
--
-- Statuses (spec §5.4): stored = draft | in_review | published | archived. Derived, never stored:
--   scheduled = published with published_at in the future; expired = published with expires_at in the past.
-- Kay (2026-11-25): expired items are hidden everywhere (lists and their own page), enforced here by RLS.
-- Press items (media_coverage, press_release) can't expire, so the press archive stays permanent.
-- Kay: press items can be saved in Phase 1 but only published once /press exists (app rule, Phase 2 lifts it).
-- Kay: publishers are a managed list (bulletin_publishers). Media contact = a role address only (app rule).
--
-- Public reads use column-level grants (Sig M1): internal columns (author_id, usage_rights, source_verified_on,
-- archived_at) are never readable with the public key, and columns added later stay private until granted.
-- Public loaders must therefore list their columns (no select("*")).
--
-- Additive: three new tables, plus bulletin_items added to the shared-tag functions and the tag_usage view
-- (20261114000000_shared_tags.sql). Relies on public.set_updated_at() and public.content_tags_sync().
--
-- Rollback (needs Kay's OK and an export first once real items exist):
--   begin;
--   drop table if exists public.bulletin_items;
--   drop table if exists public.bulletin_publishers;
--   drop table if exists public.bulletin_categories;
--   -- restore tag_rename / tag_delete / tag_usage from 20261114000000_shared_tags.sql
--   delete from public.redirects where source = 'auto' and note = 'Slug changed (bulletin_items)';
--   commit;
--   notify pgrst, 'reload schema';

begin;

------------------------------------------------------------------------------
-- Categories: the public filters, extensible from the admin without code (spec §3.2)
------------------------------------------------------------------------------
create table if not exists public.bulletin_categories (
	id uuid primary key default gen_random_uuid(),
	name text not null check (char_length(name) between 1 and 60 and name ~ '\S'),
	slug text not null unique check (
		slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 60
		and slug not in ('all', 'community-offers') -- reserved: "All updates" and the offers filter (public.promotions)
	),
	description text check (char_length(description) <= 300),
	sort_order integer not null default 0, -- ascending, like services.sort_order
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create unique index if not exists bulletin_categories_name_key on public.bulletin_categories (lower(name));

insert into public.bulletin_categories (name, slug, sort_order) values
	('Embassy Updates', 'embassy-updates', 10),
	('Community Notices', 'community-notices', 20),
	('Press & Media', 'press-media', 30),
	('Opportunities', 'opportunities', 40)
on conflict (slug) do nothing;

------------------------------------------------------------------------------
-- Publishers: one row per media organisation (Kay: a managed list, not free text)
------------------------------------------------------------------------------
create table if not exists public.bulletin_publishers (
	id uuid primary key default gen_random_uuid(),
	name text not null check (char_length(name) between 1 and 120 and name ~ '\S'),
	slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 80),
	-- A logo we have permission to use, uploaded to our media library (the app accepts Storage URLs only).
	logo_url text check (logo_url ~ '^https://[^[:space:]\\]+$' and char_length(logo_url) <= 1000),
	website_url text check (website_url ~ '^https?://[^[:space:]\\]+$' and char_length(website_url) <= 1000),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create unique index if not exists bulletin_publishers_name_key on public.bulletin_publishers (lower(name));

------------------------------------------------------------------------------
-- Items
------------------------------------------------------------------------------
create table if not exists public.bulletin_items (
	id uuid primary key default gen_random_uuid(),

	-- Core (spec §5.2)
	title text not null check (char_length(title) between 1 and 200 and title ~ '\S'),
	slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 80),
	excerpt text check (char_length(excerpt) <= 500),
	content text not null default '' check (char_length(content) <= 200000),
	content_type text not null check (content_type in ('embassy_update', 'community_notice', 'media_coverage', 'press_release', 'opportunity')),
	category_id uuid not null references public.bulletin_categories (id) on delete restrict,
	tags text[] not null default '{}' check (cardinality(tags) <= 20 and pg_column_size(tags) <= 4096),
	cover_image_url text check (cover_image_url ~ '^https://[^[:space:]\\]+$' and char_length(cover_image_url) <= 1000),
	cover_image_alt text check (char_length(cover_image_alt) <= 200),
	image_caption text check (char_length(image_caption) <= 300),
	image_credit text check (char_length(image_credit) <= 200),
	usage_rights text check (char_length(usage_rights) <= 300), -- internal, not public
	language text not null default 'en' check (language ~ '^[a-z]{2,3}(-[A-Z]{2})?$'), -- 'fil' has no 2-letter code
	author_id uuid references auth.users (id) on delete set null, -- internal, not public
	author_name text check (char_length(author_name) <= 120),

	-- Publication (stored statuses only; see the header)
	status text not null default 'draft' check (status in ('draft', 'in_review', 'published', 'archived')),
	published_at timestamptz,
	expires_at timestamptz,
	archived_at timestamptz, -- internal, not public

	-- External source (required for media coverage when published; optional elsewhere)
	publisher_id uuid references public.bulletin_publishers (id) on delete restrict,
	original_title text check (char_length(original_title) <= 300),
	source_url text check (source_url ~ '^https?://[^[:space:]\\]+$' and char_length(source_url) <= 1000),
	original_published_on date,
	media_type text check (media_type in ('newspaper', 'online', 'television', 'radio_podcast', 'embassy', 'government', 'event_coverage', 'community_publication')),
	source_language text check (source_language ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
	source_verified_on date, -- internal, not public

	-- Press release. media_contact is a role address only (Kay, 2026-11-25), never a named person.
	media_contact text check (media_contact ~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' and char_length(media_contact) <= 254),
	attachments jsonb not null default '[]' check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 10 and pg_column_size(attachments) <= 16384),

	-- Call to action (opportunities, notices): an http(s) URL or a path on this site (no // or \ tricks)
	cta_label text check (char_length(cta_label) <= 40),
	cta_url text check (cta_url ~ '^(https?://[^[:space:]\\]+|/([^/\\[:space:]][^[:space:]\\]*)?)$' and char_length(cta_url) <= 1000),

	-- Visibility (spec §5.2). is_featured = a big card on /bulletin; show_on_homepage = in the homepage preview.
	is_featured boolean not null default false,
	is_pinned boolean not null default false,
	show_on_homepage boolean not null default false,
	show_in_bulletin boolean not null default true,
	show_in_press boolean not null default false,
	display_priority integer not null default 0, -- higher first (descending)

	-- Relations to existing content (spec §5.2; single FKs like portfolios.blog_id; a join table can come later)
	event_id uuid references public.events (id) on delete set null,
	portfolio_id uuid references public.portfolios (id) on delete set null,

	meta_title text check (char_length(meta_title) <= 70),
	meta_description text check (char_length(meta_description) <= 170),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),

	constraint bulletin_items_published_has_time check (status <> 'published' or published_at is not null),
	constraint bulletin_items_archived_has_time check (status <> 'archived' or archived_at is not null),
	constraint bulletin_items_expiry_after_publish check (expires_at is null or published_at is null or expires_at > published_at),
	-- The press archive is permanent (spec §4.7).
	constraint bulletin_items_press_no_expiry check (content_type not in ('media_coverage', 'press_release') or expires_at is null),
	-- Only press items appear on /press (their canonical URL lives there).
	constraint bulletin_items_press_only check (not show_in_press or content_type in ('media_coverage', 'press_release')),
	-- External coverage can't go live without its source (spec §6.3, §11.1). Drafts may be incomplete.
	constraint bulletin_items_media_source check (
		content_type <> 'media_coverage' or status <> 'published'
		or (publisher_id is not null and source_url is not null and original_published_on is not null and media_type is not null)
	),
	-- Every press item needs a date for the year archive.
	constraint bulletin_items_press_date check (content_type <> 'press_release' or status <> 'published' or original_published_on is not null),
	-- Embassy updates link to the official source (Strict rule 15; the app checks the domain).
	constraint bulletin_items_embassy_source check (content_type <> 'embassy_update' or status <> 'published' or source_url is not null)
);

comment on table public.bulletin_items is 'Bulletin Board and Press & Media items (one record per item, shown in several places). Offers live in public.promotions.';
comment on column public.bulletin_items.published_at is 'Visible from this time (a future time = scheduled).';
comment on column public.bulletin_items.expires_at is 'Hidden everywhere from this time (expired). Press items can''t expire.';
comment on column public.bulletin_items.is_featured is 'Shown as a large card on /bulletin.';
comment on column public.bulletin_items.show_on_homepage is 'Included in the homepage Bulletin Board preview.';

-- Indexes for the real queries (Arvid m7). Small on purpose at this row count.
create index if not exists bulletin_items_board_idx on public.bulletin_items (is_pinned desc, display_priority desc, published_at desc) where status = 'published' and show_in_bulletin;
create index if not exists bulletin_items_press_idx on public.bulletin_items (original_published_on desc) where status = 'published' and show_in_press;
create index if not exists bulletin_items_home_idx on public.bulletin_items (display_priority desc, published_at desc) where status = 'published' and show_on_homepage;
create index if not exists bulletin_items_category_idx on public.bulletin_items (category_id);
create index if not exists bulletin_items_publisher_idx on public.bulletin_items (publisher_id) where publisher_id is not null;
create index if not exists bulletin_items_tags_idx on public.bulletin_items using gin (tags);
create index if not exists bulletin_items_event_idx on public.bulletin_items (event_id) where event_id is not null;
create index if not exists bulletin_items_portfolio_idx on public.bulletin_items (portfolio_id) where portfolio_id is not null;

------------------------------------------------------------------------------
-- Triggers
------------------------------------------------------------------------------
drop trigger if exists bulletin_categories_set_updated_at on public.bulletin_categories;
create trigger bulletin_categories_set_updated_at before update on public.bulletin_categories for each row execute function public.set_updated_at();
drop trigger if exists bulletin_publishers_set_updated_at on public.bulletin_publishers;
create trigger bulletin_publishers_set_updated_at before update on public.bulletin_publishers for each row execute function public.set_updated_at();
drop trigger if exists bulletin_items_set_updated_at on public.bulletin_items;
create trigger bulletin_items_set_updated_at before update on public.bulletin_items for each row execute function public.set_updated_at();
-- Shared tag list (Arvid M1): same spelling everywhere, new names registered in public.tags.
drop trigger if exists bulletin_items_tags_sync on public.bulletin_items;
create trigger bulletin_items_tags_sync before insert or update of tags on public.bulletin_items for each row execute function public.content_tags_sync();

------------------------------------------------------------------------------
-- RLS and grants
------------------------------------------------------------------------------
alter table public.bulletin_categories enable row level security;
alter table public.bulletin_publishers enable row level security;
alter table public.bulletin_items enable row level security;

drop policy if exists "Active categories are publicly readable" on public.bulletin_categories;
create policy "Active categories are publicly readable" on public.bulletin_categories
	for select to anon, authenticated using (is_active);

drop policy if exists "Publishers are publicly readable" on public.bulletin_publishers;
create policy "Publishers are publicly readable" on public.bulletin_publishers
	for select to anon, authenticated using (true);

-- Live = published, publish time reached, not expired. Drafts, items in review and archived items never leave the server.
drop policy if exists "Live items are publicly readable" on public.bulletin_items;
create policy "Live items are publicly readable" on public.bulletin_items
	for select to anon, authenticated
	using (status = 'published' and published_at <= now() and (expires_at is null or expires_at > now()));

revoke all on public.bulletin_categories, public.bulletin_publishers, public.bulletin_items from anon, authenticated;
grant select on public.bulletin_categories, public.bulletin_publishers to anon, authenticated;
-- Column-level: everything the site shows; not author_id, usage_rights, source_verified_on, archived_at (Sig M1).
grant select (
	id, title, slug, excerpt, content, content_type, category_id, tags,
	cover_image_url, cover_image_alt, image_caption, image_credit, language, author_name,
	status, published_at, expires_at,
	publisher_id, original_title, source_url, original_published_on, media_type, source_language,
	media_contact, attachments, cta_label, cta_url,
	is_featured, is_pinned, show_on_homepage, show_in_bulletin, show_in_press, display_priority,
	event_id, portfolio_id, meta_title, meta_description, created_at, updated_at
) on public.bulletin_items to anon, authenticated;
grant all on public.bulletin_categories, public.bulletin_publishers, public.bulletin_items to service_role;

------------------------------------------------------------------------------
-- Shared tags: bulletin_items joins rename / delete / usage (20261114000000_shared_tags.sql, as live on 2026-11-25)
------------------------------------------------------------------------------
create or replace function public.tag_rename(p_id uuid, p_name text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
	old_name text;
	new_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 40);
	target uuid;
begin
	new_name := btrim(new_name);
	if new_name = '' then raise exception 'Tag name is required.'; end if;
	select name into old_name from public.tags where id = p_id for update;
	if old_name is null then raise exception 'That tag no longer exists.'; end if;

	select id into target from public.tags where lower(name) = lower(new_name) and id <> p_id;
	if target is null then
		update public.tags set name = new_name where id = p_id;
		target := p_id;
	else
		select name into new_name from public.tags where id = target;
	end if;

	update public.blogs set tags = array_replace(tags, old_name, new_name) where tags @> array[old_name];
	update public.events set tags = array_replace(tags, old_name, new_name) where tags @> array[old_name];
	update public.promotions set tags = array_replace(tags, old_name, new_name) where tags @> array[old_name];
	update public.services set tags = array_replace(tags, old_name, new_name) where tags @> array[old_name];
	update public.portfolios set tags = array_replace(tags, old_name, new_name) where tags @> array[old_name];
	update public.bulletin_items set tags = array_replace(tags, old_name, new_name) where tags @> array[old_name];

	if target <> p_id then delete from public.tags where id = p_id; end if;
	return target;
end
$$;

create or replace function public.tag_delete(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
	old_name text;
begin
	select name into old_name from public.tags where id = p_id for update;
	if old_name is null then return; end if;
	update public.blogs set tags = array_remove(tags, old_name) where tags @> array[old_name];
	update public.events set tags = array_remove(tags, old_name) where tags @> array[old_name];
	update public.promotions set tags = array_remove(tags, old_name) where tags @> array[old_name];
	update public.services set tags = array_remove(tags, old_name) where tags @> array[old_name];
	update public.portfolios set tags = array_remove(tags, old_name) where tags @> array[old_name];
	update public.bulletin_items set tags = array_remove(tags, old_name) where tags @> array[old_name];
	delete from public.tags where id = p_id;
end
$$;

-- Recreated (not replaced): the new count column sits before "total".
drop view if exists public.tag_usage;
create view public.tag_usage
with (security_invoker = on)
as
select u.*, u.blogs + u.events + u.promotions + u.services + u.portfolios + u.bulletin as total
from (
	select
		t.id, t.name, t.created_at, t.updated_at,
		(select count(*) from public.blogs b where b.tags @> array[t.name])::int as blogs,
		(select count(*) from public.events e where e.tags @> array[t.name])::int as events,
		(select count(*) from public.promotions p where p.tags @> array[t.name])::int as promotions,
		(select count(*) from public.services s where s.tags @> array[t.name])::int as services,
		(select count(*) from public.portfolios f where f.tags @> array[t.name])::int as portfolios,
		(select count(*) from public.bulletin_items n where n.tags @> array[t.name])::int as bulletin
	from public.tags t
) u;

revoke all on public.tag_usage from anon, authenticated;
grant select on public.tag_usage to service_role;
revoke all on function public.tag_rename(uuid, text), public.tag_delete(uuid) from public, anon, authenticated;
grant execute on function public.tag_rename(uuid, text), public.tag_delete(uuid) to service_role;

commit;

notify pgrst, 'reload schema';
