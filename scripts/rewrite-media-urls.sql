-- One-off (2026-11-27): points stored media URLs at the R2 media library instead of Supabase Storage.
--   https://vajknggrwhjayssylfny.supabase.co/storage/v1/object/public/<bucket>/<path>  →  https://media.merkadoph.se/<bucket>/<path>
-- Run ONLY after scripts/copy-media-to-r2.mjs copied every file and https://media.merkadoph.se serves them.
-- Covers every text / jsonb column in public content tables (URLs also sit inside markdown and JSON galleries).
-- Logs (audit_logs, ops_logs, email_log) keep their history. Supabase files are not deleted, so this is reversible:
-- swap the two strings below and run it again. Afterwards purge every group in Admin → Cache.
do $$
declare
	old_prefix constant text := 'https://vajknggrwhjayssylfny.supabase.co/storage/v1/object/public/';
	new_prefix constant text := 'https://media.merkadoph.se/';
	col record;
	n bigint;
begin
	for col in
		select c.table_name, c.column_name, c.data_type
		from information_schema.columns c
		join information_schema.tables t using (table_schema, table_name)
		where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
			and c.data_type in ('text', 'jsonb')
			and c.table_name not in ('audit_logs', 'ops_logs', 'email_log')
	loop
		if col.data_type = 'jsonb' then
			execute format(
				'update public.%I set %I = replace(%I::text, $1, $2)::jsonb where %I::text like $3',
				col.table_name, col.column_name, col.column_name, col.column_name
			) using old_prefix, new_prefix, '%' || old_prefix || '%';
		else
			execute format(
				'update public.%I set %I = replace(%I, $1, $2) where %I like $3',
				col.table_name, col.column_name, col.column_name, col.column_name
			) using old_prefix, new_prefix, '%' || old_prefix || '%';
		end if;
		get diagnostics n = row_count;
		if n > 0 then raise notice '%.%: % rows', col.table_name, col.column_name, n; end if;
	end loop;
end $$;
