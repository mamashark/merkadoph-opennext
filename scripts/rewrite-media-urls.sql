-- One-off (2026-11-27): points stored media URLs at the R2 media library instead of Supabase Storage.
--   https://vajknggrwhjayssylfny.supabase.co/storage/v1/object/public/<bucket>/<path>  →  https://media.merkadoph.se/<bucket>/<path>
--
-- Order: run ONLY after the R2 code (PR #40) is released, or the live site's CSP / next/image would block the new
-- host. Afterwards purge every group in Admin → Cache.
--
-- 1. Run as is: DRY RUN, changes nothing, prints the matching rows per table.column (RAISE NOTICE).
-- 2. Back up the listed tables, then set dry_run := false and run again.
--
-- Covers every text / jsonb column in public tables (URLs also sit inside markdown and JSON galleries); logs keep
-- their history. User triggers are switched off per table during its update, so `set_updated_at` doesn't mark every
-- row as modified (that would change sitemap lastModified and blog modifiedTime). Needs table ownership (postgres).
--
-- Reversible for URLs only: swap the two prefixes and run again. Files uploaded to R2 after the switch don't exist in
-- Supabase, so a reverse run would break their links.
do $$
declare
	dry_run constant boolean := true;
	old_prefix constant text := 'https://vajknggrwhjayssylfny.supabase.co/storage/v1/object/public/';
	new_prefix constant text := 'https://media.merkadoph.se/';
	col record;
	expr text;
	n bigint;
	total bigint := 0;
begin
	for col in
		select c.table_name, c.column_name, c.data_type
		from information_schema.columns c
		join information_schema.tables t using (table_schema, table_name)
		where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
			and c.data_type in ('text', 'jsonb', 'character varying')
			and c.table_name not in ('audit_logs', 'ops_logs', 'email_log')
		order by 1, 2
	loop
		expr := case when col.data_type = 'jsonb' then format('%I::text', col.column_name) else format('%I', col.column_name) end;
		execute format('select count(*) from public.%I where %s like $1', col.table_name, expr) into n using '%' || old_prefix || '%';
		continue when n = 0;
		total := total + n;
		raise notice '%.%: % rows', col.table_name, col.column_name, n;
		continue when dry_run;
		execute format('alter table public.%I disable trigger user', col.table_name);
		execute format(
			'update public.%I set %I = %s where %s like $3',
			col.table_name, col.column_name,
			case when col.data_type = 'jsonb' then format('replace(%s, $1, $2)::jsonb', expr) else format('replace(%s, $1, $2)', expr) end,
			expr
		) using old_prefix, new_prefix, '%' || old_prefix || '%';
		execute format('alter table public.%I enable trigger user', col.table_name);
	end loop;
	raise notice '% % rows in total', case when dry_run then 'DRY RUN:' else 'Rewrote' end, total;
end $$;
