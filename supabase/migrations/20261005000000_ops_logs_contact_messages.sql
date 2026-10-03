-- Operations log (Supabase keep-alive pings, cache purges) and contact form messages.
-- Both are service-role only: RLS is on with no public policies.

------------------------------------------------------------------------------
-- Operations log
------------------------------------------------------------------------------
create table if not exists public.ops_logs (
	id bigint generated always as identity primary key,
	kind text not null check (kind in ('keepalive', 'cache_purge')),
	source text not null check (source in ('manual', 'cron')),
	scope text,
	status text not null check (status in ('success', 'error')),
	message text check (char_length(message) <= 1000),
	duration_ms integer,
	actor_email text,
	created_at timestamptz not null default now()
);

create index if not exists ops_logs_kind_created_idx on public.ops_logs (kind, created_at desc);

alter table public.ops_logs enable row level security;
grant all on public.ops_logs to service_role;

------------------------------------------------------------------------------
-- Contact messages (homepage contact form)
------------------------------------------------------------------------------
create table if not exists public.contact_messages (
	id uuid primary key default gen_random_uuid(),
	name text not null check (char_length(name) between 1 and 120),
	email text not null check (char_length(email) between 3 and 254),
	phone text check (char_length(phone) <= 40),
	topic text check (char_length(topic) <= 120),
	message text not null check (char_length(message) between 1 and 5000),
	status text not null default 'new' check (status in ('new', 'read', 'archived')),
	created_at timestamptz not null default now()
);

create index if not exists contact_messages_status_created_idx on public.contact_messages (status, created_at desc);

alter table public.contact_messages enable row level security;
grant all on public.contact_messages to service_role;

-- Make the API see the new tables immediately.
notify pgrst, 'reload schema';
