"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, ADMIN_ROLE } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_PASSWORD = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function read(formData: FormData) {
	return {
		name: String(formData.get("name") ?? "").trim().slice(0, 100),
		email: String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254),
		password: String(formData.get("password") ?? ""),
		hasAccess: formData.get("access") === "on",
	};
}

const qs = (params: Record<string, string>) => new URLSearchParams(params).toString();

export async function createUser(formData: FormData) {
	await requireAdmin();
	const { name, email, password, hasAccess } = read(formData);
	const fail = (error: string): never => redirect(`/admin/users/new?${qs({ error, name, email })}`);

	if (!EMAIL.test(email)) fail("Enter a valid email address.");
	if (password.length < MIN_PASSWORD) fail(`Password must be at least ${MIN_PASSWORD} characters.`);

	const { data, error } = await createAdminClient().auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { full_name: name },
		app_metadata: { role: hasAccess ? ADMIN_ROLE : "none" },
	});
	if (error) fail(/already/i.test(error.message) ? "A user with this email already exists." : error.message);

	revalidatePath("/admin/users");
	redirect(`/admin/users/${data.user!.id}?notice=created`);
}

export async function updateUser(formData: FormData) {
	const me = await requireAdmin();
	const id = String(formData.get("id") ?? "");
	const { name, email, password, hasAccess } = read(formData);
	const fail = (error: string): never => redirect(`/admin/users/${id}?${qs({ error })}`);

	if (!EMAIL.test(email)) fail("Enter a valid email address.");
	if (password && password.length < MIN_PASSWORD) fail(`Password must be at least ${MIN_PASSWORD} characters.`);
	if (id === me.id && !hasAccess) fail("You can't remove your own admin access.");

	const { error } = await createAdminClient().auth.admin.updateUserById(id, {
		email,
		email_confirm: true,
		user_metadata: { full_name: name },
		app_metadata: { role: hasAccess ? ADMIN_ROLE : "none" },
		...(password ? { password } : {}),
	});
	if (error) fail(error.message);

	revalidatePath("/admin/users");
	revalidatePath("/admin", "layout");
	redirect(`/admin/users/${id}?notice=${password ? "password" : "saved"}`);
}

export async function deleteUser(formData: FormData) {
	const me = await requireAdmin();
	const id = String(formData.get("id") ?? "");
	if (id === me.id) redirect(`/admin/users?${qs({ error: "You can't delete your own account." })}`);

	const { error } = await createAdminClient().auth.admin.deleteUser(id);
	if (error) redirect(`/admin/users?${qs({ error: error.message })}`);

	revalidatePath("/admin/users");
	redirect("/admin/users?notice=deleted");
}
