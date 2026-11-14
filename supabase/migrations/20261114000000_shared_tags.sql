-- Shared tags for blogs, events, promotions, services and portfolios (Admin → Tags).
-- Run after 20261028000000_grants_baseline.sql. Safe to run more than once. Runs as one transaction.
--
-- Model
-- - public.tags is the one list of tag names. Names are unique ignoring case ("Food" = "food").
-- - Each content table keeps its `tags text[]` column (what the site reads and filters on). A trigger
--   rewrites every saved array to the shared spelling and adds new names to public.tags, so all five
--   content types draw from one list without changing any read query.
-- - Rename / merge / delete go through tag_rename() and tag_delete(), which update every content row.
-- - Product tags (public.product_tags) stay separate: they have their own slugs and /shop?tag= URLs.
-- - Server only: no grants to anon / authenticated. The public site reads tags from the content rows.

begin;

/* ------------------------------------------------------------------ */
/* 1. The shared list                                                  */
/* ------------------------------------------------------------------ */

create table if not exists public.tags (
	id uuid primary key default gen_random_uuid(),
	name text not null check (char_length(name) between 1 and 40 and name = btrim(name)),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create unique index if not exists tags_name_lower_key on public.tags (lower(name));

drop trigger if exists tags_set_updated_at on public.tags;
create trigger tags_set_updated_at before update on public.tags for each row execute function public.set_updated_at();

alter table public.tags enable row level security;
revoke all on public.tags from anon, authenticated;
grant all on public.tags to service_role;

/* ------------------------------------------------------------------ */
/* 2. Canonical spelling on every content save                        */
/* ------------------------------------------------------------------ */

-- Trims, collapses spaces, caps at 40 chars, drops blanks and case-insensitive duplicates, keeps at most
-- 10, registers new names in public.tags and returns each tag in its shared spelling (order kept).
create or replace function public.canonical_tags(input text[])
returns text[]
language plpgsql
set search_path = ''
as $$
declare
	raw text;
	t text;
	canon text;
	result text[] := '{}';
begin
	foreach raw in array coalesce(input, '{}') loop
		t := left(btrim(regexp_replace(coalesce(raw, ''), '\s+', ' ', 'g')), 40);
		t := btrim(t);
		continue when t = '';
		insert into public.tags (name) values (t) on conflict ((lower(name))) do nothing;
		select name into canon from public.tags where lower(name) = lower(t);
		continue when canon = any(result);
		result := result || canon;
		exit when cardinality(result) >= 10;
	end loop;
	return result;
end
$$;

create or replace function public.content_tags_sync()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.tags := public.canonical_tags(new.tags);
	return new;
end
$$;

do $$
declare
	tbl text;
begin
	foreach tbl in array array['blogs', 'events', 'promotions', 'services', 'portfolios'] loop
		execute format('drop trigger if exists %I on public.%I', tbl || '_tags_sync', tbl);
		execute format('create trigger %I before insert or update of tags on public.%I for each row execute function public.content_tags_sync()', tbl || '_tags_sync', tbl);
		-- Fast "has tag X" filters on the site and in admin.
		execute format('create index if not exists %I on public.%I using gin (tags)', tbl || '_tags_idx', tbl);
	end loop;
end
$$;

/* ------------------------------------------------------------------ */
/* 3. Backfill: register existing tags and unify their spelling       */
/* ------------------------------------------------------------------ */

-- One spelling per name ignoring case; capitalised spellings win ("Filipino Food" beats "filipino food").
insert into public.tags (name)
select distinct on (lower(t)) t
from (
	select btrim(left(btrim(regexp_replace(unnest(tags), '\s+', ' ', 'g')), 40)) as t from public.blogs
	union all select btrim(left(btrim(regexp_replace(unnest(tags), '\s+', ' ', 'g')), 40)) from public.events
	union all select btrim(left(btrim(regexp_replace(unnest(tags), '\s+', ' ', 'g')), 40)) from public.promotions
	union all select btrim(left(btrim(regexp_replace(unnest(tags), '\s+', ' ', 'g')), 40)) from public.services
	union all select btrim(left(btrim(regexp_replace(unnest(tags), '\s+', ' ', 'g')), 40)) from public.portfolios
) s
where btrim(t) <> ''
order by lower(t), (t = lower(t)), t
on conflict ((lower(name))) do nothing;

-- Only rows whose spelling actually changes are touched (their updated_at moves; others keep theirs).
update public.blogs set tags = public.canonical_tags(tags) where tags is distinct from public.canonical_tags(tags);
update public.events set tags = public.canonical_tags(tags) where tags is distinct from public.canonical_tags(tags);
update public.promotions set tags = public.canonical_tags(tags) where tags is distinct from public.canonical_tags(tags);
update public.services set tags = public.canonical_tags(tags) where tags is distinct from public.canonical_tags(tags);
update public.portfolios set tags = public.canonical_tags(tags) where tags is distinct from public.canonical_tags(tags);

/* ------------------------------------------------------------------ */
/* 4. Rename, merge and delete across every content type              */
/* ------------------------------------------------------------------ */

-- Renames a tag everywhere. If another tag already has that name (ignoring case), the two are merged.
-- Returns the id of the tag that remains.
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
		-- Plain rename (also covers a change of case only).
		update public.tags set name = new_name where id = p_id;
		target := p_id;
	else
		select name into new_name from public.tags where id = target;
	end if;

	-- The sync trigger re-applies shared spelling and removes duplicates a merge creates.
	update public.blogs set tags = array_replace(tags, old_name, new_name) where tags @> array[old_name];
	update public.events set tags = array_replace(tags, old_name, new_name) where tags @> array[old_name];
	update public.promotions set tags = array_replace(tags, old_name, new_name) where tags @> array[old_name];
	update public.services set tags = array_replace(tags, old_name, new_name) where tags @> array[old_name];
	update public.portfolios set tags = array_replace(tags, old_name, new_name) where tags @> array[old_name];

	if target <> p_id then delete from public.tags where id = p_id; end if;
	return target;
end
$$;

-- Removes a tag from every content row, then deletes it.
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
	delete from public.tags where id = p_id;
end
$$;

/* ------------------------------------------------------------------ */
/* 5. Usage counts for Admin → Tags (all rows, drafts included)       */
/* ------------------------------------------------------------------ */

create or replace view public.tag_usage
with (security_invoker = on)
as
select u.*, u.blogs + u.events + u.promotions + u.services + u.portfolios as total
from (
select
	t.id,
	t.name,
	t.created_at,
	t.updated_at,
	(select count(*) from public.blogs b where b.tags @> array[t.name])::int as blogs,
	(select count(*) from public.events e where e.tags @> array[t.name])::int as events,
	(select count(*) from public.promotions p where p.tags @> array[t.name])::int as promotions,
	(select count(*) from public.services s where s.tags @> array[t.name])::int as services,
	(select count(*) from public.portfolios f where f.tags @> array[t.name])::int as portfolios
from public.tags t
) u;

/* ------------------------------------------------------------------ */
/* 6. Grants: server only                                              */
/* ------------------------------------------------------------------ */

revoke all on public.tag_usage from anon, authenticated;
grant select on public.tag_usage to service_role;

revoke all on function
	public.canonical_tags(text[]),
	public.content_tags_sync(),
	public.tag_rename(uuid, text),
	public.tag_delete(uuid)
from public, anon, authenticated;

grant execute on function
	public.canonical_tags(text[]),
	public.content_tags_sync(),
	public.tag_rename(uuid, text),
	public.tag_delete(uuid)
to service_role;

commit;

notify pgrst, 'reload schema';
