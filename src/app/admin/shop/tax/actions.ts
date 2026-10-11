"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { purgeShop } from "@/lib/cache";
import { slugify } from "@/lib/content";
import { adminTaxSettings } from "./data";

const back = (params: Record<string, string>, returnTo = ""): never => redirect(`/admin/shop/tax?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(returnTo)), ...params })}`);

export async function saveTaxSettings(formData: FormData) {
	await requireAdmin();
	const enabled = formData.get("enabled") === "on";
	const defaultClass = String(formData.get("default_class") ?? "");
	const db = createAdminClient();
	const { data: cls } = await db.from("tax_classes").select("id").eq("id", defaultClass).maybeSingle();
	if (!cls) back({ error: "Pick a default VAT class that exists." });

	const before = await adminTaxSettings();
	const { error } = await db.from("site_settings").upsert({ key: "tax", value: { enabled, default_class: defaultClass } });
	if (error) back({ error: error.message });
	await audit({ kind: "admin", action: "shop.tax_settings", entity: "site_settings", entityId: "tax", summary: `VAT ${enabled ? "ON" : "OFF"}, default class ${defaultClass}`, details: { before } });
	purgeShop();
	back({ notice: enabled ? "Saved. VAT is ON — prices are treated as including VAT." : "Saved. VAT is OFF." });
}

const classSchema = z.object({
	name: z.string().trim().min(1, "Enter a name.").max(60),
	rate: z.coerce.number("Enter the rate as a number.").min(0, "The rate can't be negative.").max(100, "The rate can't be over 100%."),
	sort_order: z.coerce.number().int().min(-999).max(999),
});

export async function saveTaxClass(formData: FormData) {
	await requireAdmin();
	const returnTo = String(formData.get("return") ?? "");
	const existingId = String(formData.get("id") ?? "");
	const parsed = classSchema.safeParse({ name: formData.get("name"), rate: String(formData.get("rate") ?? "").replace(",", "."), sort_order: formData.get("sort_order") || 0 });
	if (!parsed.success) back({ error: parsed.error.issues[0]?.message ?? "Please check the fields.", ...(existingId ? { edit: existingId } : {}) }, returnTo);
	const v = parsed.data!;
	const rate = Math.round(v.rate * 100) / 100;
	const db = createAdminClient();

	if (existingId) {
		const { error } = await db.from("tax_classes").update({ name: v.name, rate, sort_order: v.sort_order }).eq("id", existingId);
		if (error) back({ error: error.message, edit: existingId }, returnTo);
		await audit({ kind: "admin", action: "shop.tax_class_update", entity: "tax_classes", entityId: existingId, summary: `${v.name}: ${rate}%` });
	} else {
		const id = (slugify(String(formData.get("new_id") || v.name)) || "class").slice(0, 30);
		const { error } = await db.from("tax_classes").insert({ id, name: v.name, rate, sort_order: v.sort_order });
		if (error) back({ error: error.code === "23505" ? `A class with the id “${id}” already exists.` : error.message }, returnTo);
		await audit({ kind: "admin", action: "shop.tax_class_create", entity: "tax_classes", entityId: id, summary: `${v.name}: ${rate}%` });
	}
	purgeShop();
	back({ notice: existingId ? "VAT class updated." : "VAT class added." }, returnTo);
}

export async function deleteTaxClass(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id") ?? "");
	const returnTo = String(formData.get("return") ?? "");
	const db = createAdminClient();
	if ((await adminTaxSettings()).default_class === id) back({ error: "That's the default class. Choose another default first." }, returnTo);
	const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("tax_class", id);
	if (count) back({ error: `${count} product(s) use this class. Move them to another class first.` }, returnTo);
	const { data } = await db.from("tax_classes").delete().eq("id", id).select("name").maybeSingle();
	if (data) await audit({ kind: "admin", action: "shop.tax_class_delete", entity: "tax_classes", entityId: id, summary: `Removed ${data.name}` });
	purgeShop();
	back({ notice: "VAT class removed." }, returnTo);
}
