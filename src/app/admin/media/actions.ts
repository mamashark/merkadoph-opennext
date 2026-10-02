"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { assertBucket, cleanFolder, createFolder, deleteFile, listBuckets, listFolder, uploadImages, type MediaFile, type MediaListing } from "@/lib/media";

function mediaUrl(bucket: string, path: string, flash: Record<string, string> = {}) {
	const params = new URLSearchParams({ bucket, ...(path ? { path } : {}), ...flash });
	return `/admin/media?${params}`;
}

function message(err: unknown) {
	return err instanceof Error ? err.message : "Something went wrong.";
}

function filesFrom(formData: FormData): File[] {
	return formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
}

/* ------------------------- Media page form actions ------------------------- */

export async function uploadMediaAction(formData: FormData) {
	await requireAdmin();
	const bucket = String(formData.get("bucket") ?? "");
	const path = String(formData.get("path") ?? "");
	let flash: Record<string, string>;
	try {
		await assertBucket(bucket);
		const files = filesFrom(formData);
		if (files.length === 0) throw new Error("Choose at least one image to upload.");
		const uploaded = await uploadImages(bucket, path, files);
		flash = { notice: `Uploaded ${uploaded.length} image${uploaded.length === 1 ? "" : "s"}.` };
	} catch (err) {
		flash = { error: message(err) };
	}
	revalidatePath("/admin/media");
	redirect(mediaUrl(bucket, path, flash));
}

export async function deleteMediaAction(formData: FormData) {
	await requireAdmin();
	const bucket = String(formData.get("bucket") ?? "");
	const path = String(formData.get("path") ?? "");
	const file = String(formData.get("file") ?? "");
	let flash: Record<string, string>;
	try {
		await assertBucket(bucket);
		await deleteFile(bucket, file);
		flash = { notice: `Deleted ${file.split("/").pop()}.` };
	} catch (err) {
		flash = { error: message(err) };
	}
	revalidatePath("/admin/media");
	redirect(mediaUrl(bucket, path, flash));
}

export async function createFolderAction(formData: FormData) {
	await requireAdmin();
	const bucket = String(formData.get("bucket") ?? "");
	const parent = String(formData.get("path") ?? "");
	let target = parent;
	let flash: Record<string, string>;
	try {
		await assertBucket(bucket);
		target = await createFolder(bucket, parent, String(formData.get("name") ?? ""));
		flash = { notice: "Folder created." };
	} catch (err) {
		flash = { error: message(err) };
	}
	revalidatePath("/admin/media");
	redirect(mediaUrl(bucket, target, flash));
}

/* ---------------------- Media picker (called from client) ---------------------- */

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function browseMedia(bucket?: string, path?: string): Promise<Result<MediaListing & { buckets: string[] }>> {
	await requireAdmin();
	try {
		const buckets = await listBuckets();
		const target = bucket && buckets.includes(bucket) ? bucket : buckets[0];
		if (!target) return { ok: false, error: "No public storage buckets found." };
		const listing = await listFolder(target, cleanFolder(path));
		return { ok: true, data: { ...listing, buckets } };
	} catch (err) {
		return { ok: false, error: message(err) };
	}
}

export async function uploadFromPicker(formData: FormData): Promise<Result<MediaFile[]>> {
	await requireAdmin();
	try {
		const bucket = await assertBucket(String(formData.get("bucket") ?? ""));
		const files = filesFrom(formData);
		if (files.length === 0) return { ok: false, error: "Choose an image to upload." };
		const uploaded = await uploadImages(bucket, String(formData.get("path") ?? ""), files);
		revalidatePath("/admin/media");
		return { ok: true, data: uploaded };
	} catch (err) {
		return { ok: false, error: message(err) };
	}
}
