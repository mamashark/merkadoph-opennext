"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, ADMIN_ROLE } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { passwordSchema } from "@/lib/validation";

/** Every unmet password rule in one message, or null when it meets the policy (same rules as Supabase Auth). */
function passwordProblem(password: string): string | null {
	const result = passwordSchema.safeParse(password);
	if (result.success) return null;
	return [...new Set(result.error.issues.map((i) => i.message))].join(" ") || WEAK_PASSWORD;
}

/** Shown if Supabase rejects a password our own check accepted (its policy can be changed in the dashboard). */
const WEAK_PASSWORD = "Supabase rejected this password as too weak. Choose a longer one with lowercase and uppercase letters, a number and a symbol.";
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
	const problem = passwordProblem(password);
	if (problem) fail(problem);

	const { data, error } = await createAdminClient().auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { full_name: name },
		app_metadata: { role: hasAccess ? ADMIN_ROLE : "none" },
	});
	if (error) fail(error.code === "weak_password" ? WEAK_PASSWORD : /already/i.test(error.message) ? "A user with this email already exists." : error.message);

	revalidatePath("/admin/users");
	await audit({ kind: "admin", action: "users.create", entity: "users", entityId: data.user!.id, summary: email, details: { adminAccess: hasAccess } });
	redirect(`/admin/users/${data.user!.id}?notice=created`);
}

export async function updateUser(formData: FormData) {
	const me = await requireAdmin();
	const id = String(formData.get("id") ?? "");
	const { name, email, password, hasAccess } = read(formData);
	const fail = (error: string): never => redirect(`/admin/users/${id}?${qs({ error })}`);

	if (!EMAIL.test(email)) fail("Enter a valid email address.");
	const problem = password ? passwordProblem(password) : null;
	if (problem) fail(problem);
	if (id === me.id && !hasAccess) fail("You can't remove your own admin access.");

	const { error } = await createAdminClient().auth.admin.updateUserById(id, {
		email,
		email_confirm: true,
		user_metadata: { full_name: name },
		app_metadata: { role: hasAccess ? ADMIN_ROLE : "none" },
		...(password ? { password } : {}),
	});
	if (error) fail(error.code === "weak_password" ? WEAK_PASSWORD : error.message);

	revalidatePath("/admin/users");
	revalidatePath("/admin", "layout");
	await audit({ kind: "admin", action: "users.update", entity: "users", entityId: id, summary: email, details: { adminAccess: hasAccess, passwordChanged: !!password } });
	redirect(`/admin/users/${id}?notice=${password ? "password" : "saved"}`);
}

export async function deleteUser(formData: FormData) {
	const me = await requireAdmin();
	const id = String(formData.get("id") ?? "");
	if (id === me.id) redirect(`/admin/users?${qs({ error: "You can't delete your own account." })}`);

	const { error } = await createAdminClient().auth.admin.deleteUser(id);
	if (error) redirect(`/admin/users?${qs({ error: error.message })}`);

	revalidatePath("/admin/users");
	await audit({ kind: "admin", action: "users.delete", entity: "users", entityId: id });
	redirect("/admin/users?notice=deleted");
}
