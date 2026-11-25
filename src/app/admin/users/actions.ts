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

/**
 * Create/edit form state. Errors come back through useActionState instead of the URL, so no email or
 * free text ends up in the address bar, browser history or logs; what was typed (never the password) is kept.
 */
export type UserFormState = {
	error?: string;
	/** Success message after an edit (shown in the form; creating a user redirects to its page instead). */
	notice?: string;
	/** Changes on every save, so the form remounts with fresh values and an empty password field. */
	savedAt?: number;
	values?: { name: string; email: string; hasAccess: boolean };
};

const SAVE_FAILED = "Couldn't save the user. Please try again, or check the Supabase status if it keeps happening.";

/** Plain-English message for a Supabase Auth error; anything unexpected is logged on the server only. */
function authErrorMessage(where: string, error: { code?: string; message: string }): string {
	if (error.code === "weak_password") return WEAK_PASSWORD;
	if (error.code === "email_exists" || /already/i.test(error.message)) return "A user with this email already exists.";
	if (error.code === "email_address_invalid") return "Enter a valid email address.";
	console.error(`[admin/users] ${where}`, error.code ?? "", error.message);
	return SAVE_FAILED;
}

export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
	await requireAdmin();
	const { name, email, password, hasAccess } = read(formData);
	const fail = (error: string): UserFormState => ({ error, values: { name, email, hasAccess } });

	if (!EMAIL.test(email)) return fail("Enter a valid email address.");
	const problem = passwordProblem(password);
	if (problem) return fail(problem);

	const { data, error } = await createAdminClient().auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { full_name: name },
		app_metadata: { role: hasAccess ? ADMIN_ROLE : "none" },
	});
	if (error || !data.user) return fail(error ? authErrorMessage("createUser", error) : SAVE_FAILED);

	revalidatePath("/admin/users");
	await audit({ kind: "admin", action: "users.create", entity: "users", entityId: data.user.id, summary: email, details: { adminAccess: hasAccess } });
	redirect(`/admin/users/${data.user.id}?notice=created`);
}

export async function updateUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
	const me = await requireAdmin();
	const id = String(formData.get("id") ?? "");
	const { name, email, password, hasAccess } = read(formData);
	const fail = (error: string): UserFormState => ({ error, values: { name, email, hasAccess } });

	if (!EMAIL.test(email)) return fail("Enter a valid email address.");
	const problem = password ? passwordProblem(password) : null;
	if (problem) return fail(problem);
	if (id === me.id && !hasAccess) return fail("You can't remove your own admin access.");

	const { error } = await createAdminClient().auth.admin.updateUserById(id, {
		email,
		email_confirm: true,
		user_metadata: { full_name: name },
		app_metadata: { role: hasAccess ? ADMIN_ROLE : "none" },
		...(password ? { password } : {}),
	});
	if (error) return fail(authErrorMessage("updateUser", error));

	revalidatePath("/admin/users");
	revalidatePath("/admin", "layout");
	await audit({ kind: "admin", action: "users.update", entity: "users", entityId: id, summary: email, details: { adminAccess: hasAccess, passwordChanged: !!password } });
	return { notice: password ? "Changes saved and password updated." : "Changes saved.", savedAt: Date.now() };
}

export async function deleteUser(formData: FormData) {
	const me = await requireAdmin();
	const id = String(formData.get("id") ?? "");
	// Only short codes go in the URL; the page maps them to text (DELETE_ERRORS), so a crafted link can't show made-up messages.
	if (id === me.id) redirect("/admin/users?error=delete-self");

	const { error } = await createAdminClient().auth.admin.deleteUser(id);
	if (error) {
		console.error("[admin/users] deleteUser", error.code ?? "", error.message);
		redirect("/admin/users?error=delete-failed");
	}

	revalidatePath("/admin/users");
	await audit({ kind: "admin", action: "users.delete", entity: "users", entityId: id });
	redirect("/admin/users?notice=deleted");
}
