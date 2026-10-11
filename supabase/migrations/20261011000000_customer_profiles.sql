-- Shopper accounts (shop-reference.md §2, A2): one profile row per customer.
-- Run after 20261010000000_security_seo.sql. Safe to run more than once.

create table if not exists public.customer_profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	first_name text not null default '' check (char_length(first_name) <= 60),
	last_name text not null default '' check (char_length(last_name) <= 60),
	phone text check (char_length(phone) <= 40),
	marketing_opt_in boolean not null default false,
	marketing_opt_in_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

drop trigger if exists customer_profiles_set_updated_at on public.customer_profiles;
create trigger customer_profiles_set_updated_at before update on public.customer_profiles for each row execute function public.set_updated_at();

-- Customers read and update only their own row; rows are created by the server (service role) at registration.
alter table public.customer_profiles enable row level security;
drop policy if exists "Customers read own profile" on public.customer_profiles;
create policy "Customers read own profile" on public.customer_profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "Customers update own profile" on public.customer_profiles;
create policy "Customers update own profile" on public.customer_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke all on public.customer_profiles from anon, authenticated;
grant select on public.customer_profiles to authenticated;
-- Only these columns can be changed by the customer themselves.
grant update (first_name, last_name, phone, marketing_opt_in, marketing_opt_in_at) on public.customer_profiles to authenticated;
grant all on public.customer_profiles to service_role;

notify pgrst, 'reload schema';
