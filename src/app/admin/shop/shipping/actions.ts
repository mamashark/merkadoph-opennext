"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { purgeShop } from "@/lib/cache";

const amount = (label: string) =>
	z
		.string()
		.trim()
		.transform((v) => v.replace(/\s/g, "").replace(",", "."))
		.refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 1_000_000), `${label}: enter an amount like 69 or 69.50.`);

const schema = z.object({
	type: z.enum(["flat_rate", "weight_based", "local_delivery", "pickup"], "Choose a delivery type."),
	title: z.string().trim().min(1, "Enter a name customers will see.").max(80),
	description: z.string().trim().max(300),
	price: amount("Price"),
	free_over: amount("Free over"),
	weight_bands: z.string().max(2000),
	postcodes: z.string().max(4000),
	pickup_address: z.string().trim().max(300),
	sort_order: z.coerce.number().int().min(-999).max(999),
});

/** "5 = 79" lines → [{ max_kg: 5, price: 79 }] (sorted, no duplicates). */
function parseBands(text: string): { bands: Array<{ max_kg: number; price: number }>; error?: string } {
	const bands: Array<{ max_kg: number; price: number }> = [];
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim();
		if (!line) continue;
		const m = line.replace(/,/g, ".").match(/^(\d+(?:\.\d+)?)\s*(?:kg)?\s*[=:]\s*(\d+(?:\.\d{1,2})?)$/i);
		if (!m) return { bands, error: `Weight band “${line}” isn't in the form “5 = 79” (up to 5 kg costs 79).` };
		bands.push({ max_kg: Number(m[1]), price: Number(m[2]) });
	}
	bands.sort((a, b) => a.max_kg - b.max_kg);
	if (new Set(bands.map((b) => b.max_kg)).size !== bands.length) return { bands, error: "Two weight bands have the same weight." };
	return { bands };
}

/** Postcode prefixes: digits only, 1–5 digits each ("11", "123 45"). */
function parsePostcodes(text: string): { postcodes: string[]; error?: string } {
	const parts = text.split(/[\s,;]+/).filter(Boolean);
	// "123 45" was split by the whitespace above: re-join a 3-digit part followed by a 2-digit part.
	const joined: string[] = [];
	for (let i = 0; i < parts.length; i++) {
		if (/^\d{3}$/.test(parts[i]) && /^\d{2}$/.test(parts[i + 1] ?? "")) joined.push(parts[i] + parts[++i]);
		else joined.push(parts[i]);
	}
	const bad = joined.find((p) => !/^\d{1,5}$/.test(p));
	if (bad) return { postcodes: [], error: `“${bad}” isn't a postcode or postcode start (digits only, e.g. 111 or 123 45).` };
	return { postcodes: [...new Set(joined)].slice(0, 500) };
}

export async function saveShippingMethod(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id") ?? "");
	const formUrl = id ? `/admin/shop/shipping/${id}` : "/admin/shop/shipping/new";
	const fail = (error: string): never => redirect(`${formUrl}?${new URLSearchParams({ error })}`);

	const parsed = schema.safeParse(Object.fromEntries(["type", "title", "description", "price", "free_over", "weight_bands", "postcodes", "pickup_address", "sort_order"].map((k) => [k, String(formData.get(k) ?? "")])));
	if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Please check the fields.");
	const v = parsed.data!;
	const { bands, error: bandError } = parseBands(v.weight_bands);
	if (bandError) fail(bandError);
	const { postcodes, error: postError } = parsePostcodes(v.postcodes);
	if (postError) fail(postError);
	if (v.type === "weight_based" && !bands.length) fail("Add at least one weight band, e.g. “5 = 79”.");
	if (v.type === "local_delivery" && !postcodes.length) fail("Add the postcodes (or postcode starts) you deliver to.");
	if (v.type === "pickup" && !v.pickup_address) fail("Add the pickup address customers should go to.");

	const row = {
		type: v.type,
		title: v.title,
		description: v.description || null,
		price: v.type === "pickup" ? 0 : Number(v.price || 0),
		free_over: v.type === "pickup" || v.free_over === "" ? null : Number(v.free_over),
		weight_bands: v.type === "weight_based" ? bands : [],
		postcodes: v.type === "local_delivery" ? postcodes : [],
		pickup_address: v.type === "pickup" ? v.pickup_address : null,
		enabled: formData.get("enabled") === "on",
		sort_order: v.sort_order,
	};
	const db = createAdminClient();
	const { data, error } = id ? await db.from("shipping_methods").update(row).eq("id", id).select("id").maybeSingle() : await db.from("shipping_methods").insert(row).select("id").single();
	if (error || !data) fail(error?.message ?? "Shipping method not found.");
	await audit({ kind: "admin", action: id ? "shop.shipping_update" : "shop.shipping_create", entity: "shipping_methods", entityId: data!.id as string, summary: `${row.title} (${row.type}, ${row.enabled ? "on" : "off"})` });
	purgeShop();
	redirect(`/admin/shop/shipping?notice=${encodeURIComponent(id ? "Shipping method saved." : "Shipping method added.")}`);
}

export async function deleteShippingMethod(formData: FormData) {
	await requireAdmin();
	const id = String(formData.get("id") ?? "");
	const returnTo = String(formData.get("return") ?? "");
	const { data } = await createAdminClient().from("shipping_methods").delete().eq("id", id).select("title").maybeSingle();
	if (data) await audit({ kind: "admin", action: "shop.shipping_delete", entity: "shipping_methods", entityId: id, summary: `Removed ${data.title}` });
	purgeShop();
	redirect(`/admin/shop/shipping?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(returnTo)), notice: "Shipping method removed." })}`);
}
