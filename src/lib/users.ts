import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth-shared";

// Callers must have passed requireAdmin(): everything here uses the service role.

export type AdminUser = {
	id: string;
	email: string;
	name: string;
	hasAccess: boolean;
	createdAt: string;
	lastSignInAt: string | null;
};

function toAdminUser(user: User): AdminUser {
	return {
		id: user.id,
		email: user.email ?? "",
		name: (user.user_metadata?.full_name as string | undefined) ?? "",
		hasAccess: isAdmin(user),
		createdAt: user.created_at,
		lastSignInAt: user.last_sign_in_at ?? null,
	};
}

export async function listUsers(): Promise<AdminUser[]> {
	const { data, error } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
	if (error) throw new Error(`Failed to load users: ${error.message}`);
	return data.users.map(toAdminUser).sort((a, b) => a.email.localeCompare(b.email));
}

export async function getUser(id: string): Promise<AdminUser | null> {
	const { data, error } = await createAdminClient().auth.admin.getUserById(id);
	if (error || !data.user) return null;
	return toAdminUser(data.user);
}
