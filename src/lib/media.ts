import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { MEDIA_URL } from "@/lib/env";
import { MAX_FILES_PER_UPLOAD, uploadProblem, VIDEO_TYPES, videoProblem } from "@/lib/upload-rules";

// Callers must have passed requireAdmin(): everything here writes to the public media bucket.

/** True when the bytes really are a WebP file ("RIFF" .... "WEBP"), whatever the name or reported type says. */
function isWebpBytes(buf: ArrayBuffer): boolean {
	const b = new Uint8Array(buf, 0, Math.min(12, buf.byteLength));
	const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
	return b.length === 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
}

/** The real container of a video file ("ftyp" box = MP4, EBML header = WebM), or null. Never trusts the name alone. */
function videoKind(buf: ArrayBuffer): "mp4" | "webm" | null {
	const b = new Uint8Array(buf, 0, Math.min(12, buf.byteLength));
	if (b.length >= 8 && String.fromCharCode(...b.slice(4, 8)) === "ftyp") return "mp4";
	if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "webm";
	return null;
}

/** Marker object for empty folders (R2, like Supabase Storage, only has keys; a folder exists while something is in it). */
const PLACEHOLDER = ".emptyFolderPlaceholder";

/**
 * Top-level "buckets" of the media library. Since the move to Cloudflare R2 (2026-11-27) they are key prefixes in
 * the one R2 bucket `merkadoph-media` (binding MEDIA), so every old Supabase path kept its place: `blogs/<path>`.
 */
const BUCKETS = ["blogs"] as const;

/** One year, never revalidated: file names are never reused (uploads never overwrite). */
const CACHE_CONTROL = "public, max-age=31536000, immutable";

async function r2(): Promise<R2Bucket> {
	const bucket = getCloudflareContext().env.MEDIA as R2Bucket | undefined;
	if (!bucket) throw new Error("Media storage (R2 binding MEDIA) is not configured.");
	return bucket;
}

export type MediaFile = {
	name: string;
	path: string;
	url: string;
	size: number;
	type: string;
	updatedAt: string | null;
};

export type MediaListing = {
	bucket: string;
	path: string;
	folders: string[];
	files: MediaFile[];
};

/** Normalises a folder path and rejects traversal or odd characters. Returns "" for the bucket root. */
export function cleanFolder(input: string | null | undefined): string {
	const segments = String(input ?? "")
		.split("/")
		.map((s) => s.trim())
		.filter(Boolean);
	if (segments.some((s) => s === "." || s === ".." || !/^[\w .-]+$/.test(s))) throw new Error("Invalid folder path.");
	return segments.join("/");
}

function cleanFileName(name: string): string {
	const dot = name.lastIndexOf(".");
	const base = (dot > 0 ? name.slice(0, dot) : name)
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
	return `${base || "image"}${ext ? "." + ext : ""}`;
}

export async function listBuckets(): Promise<string[]> {
	return [...BUCKETS];
}

export async function assertBucket(bucket: string): Promise<string> {
	if (!(BUCKETS as readonly string[]).includes(bucket)) throw new Error(`Unknown media bucket: ${bucket}`);
	return bucket;
}

export function publicUrl(bucket: string, path: string): string {
	return `${MEDIA_URL}/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export async function listFolder(bucket: string, folder: string): Promise<MediaListing> {
	const path = cleanFolder(folder);
	const prefix = `${bucket}/${path ? `${path}/` : ""}`;
	const store = await r2();
	const folders: string[] = [];
	const files: MediaFile[] = [];
	let cursor: string | undefined;
	// Up to 1000 files per folder, as before. `include` is needed for the content type.
	do {
		const page = await store.list({ prefix, delimiter: "/", cursor, limit: 1000, include: ["httpMetadata"] });
		for (const p of page.delimitedPrefixes) folders.push(p.slice(prefix.length).replace(/\/$/, ""));
		for (const obj of page.objects) {
			const name = obj.key.slice(prefix.length);
			if (name === PLACEHOLDER) continue;
			const filePath = path ? `${path}/${name}` : name;
			files.push({
				name,
				path: filePath,
				url: publicUrl(bucket, filePath),
				size: obj.size,
				type: obj.httpMetadata?.contentType ?? "",
				updatedAt: obj.uploaded.toISOString(),
			});
		}
		cursor = page.truncated ? page.cursor : undefined;
	} while (cursor && files.length < 1000);
	folders.sort((a, b) => a.localeCompare(b));
	// Newest first, like the Supabase listing was.
	files.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
	return { bucket, path, folders, files };
}

/** Writes a new object only if the key is free (If-None-Match: *). Returns false on a name clash. */
async function putNew(key: string, body: ArrayBuffer | Blob, contentType: string): Promise<boolean> {
	const store = await r2();
	const written = await store.put(key, body, {
		httpMetadata: { contentType, cacheControl: CACHE_CONTROL },
		onlyIf: new Headers({ "If-None-Match": "*" }),
	});
	return written !== null;
}

/** Tries the clean name, then up to four random suffixes, so an upload never overwrites a file. */
async function uploadUnique(prefix: string, cleanName: string, body: ArrayBuffer | Blob, contentType: string): Promise<string> {
	for (let attempt = 0; attempt < 5; attempt++) {
		const name = attempt === 0 ? cleanName : cleanName.replace(/(\.[a-z0-9]+)?$/, `-${Math.random().toString(36).slice(2, 7)}$1`);
		if (await putNew(`${prefix}${name}`, body, contentType)) return name;
	}
	throw new Error(`${cleanName}: couldn't find a free file name.`);
}

export async function uploadImages(bucket: string, folder: string, files: File[]): Promise<MediaFile[]> {
	const path = cleanFolder(folder);
	const uploaded: MediaFile[] = [];

	// Validate the whole batch first so nothing is uploaded when any file is rejected.
	if (files.length > MAX_FILES_PER_UPLOAD) throw new Error(`Upload up to ${MAX_FILES_PER_UPLOAD} images at a time.`);
	const bodies: ArrayBuffer[] = [];
	for (const file of files) {
		const problem = uploadProblem(file);
		if (problem) throw new Error(problem);
		const body = await file.arrayBuffer();
		if (!isWebpBytes(body)) throw new Error(`${file.name}: this isn't a real WebP image (it may be a renamed JPG/PNG). Convert it to WebP first.`);
		bodies.push(body);
	}

	const prefix = `${bucket}/${path ? `${path}/` : ""}`;
	for (const [i, file] of files.entries()) {
		const name = await uploadUnique(prefix, cleanFileName(file.name), bodies[i], "image/webp");
		const filePath = path ? `${path}/${name}` : name;
		uploaded.push({ name, path: filePath, url: publicUrl(bucket, filePath), size: file.size, type: "image/webp", updatedAt: new Date().toISOString() });
	}
	return uploaded;
}

/** Folder videos go into, in the first bucket. */
const VIDEO_FOLDER = "videos";

/** Uploads one MP4 / WebM (blog video / reel) to the media library. Never overwrites an existing file. */
export async function uploadVideo(file: File): Promise<MediaFile> {
	const problem = videoProblem(file);
	if (problem) throw new Error(problem);
	// Only the first bytes are read to check the format (Sig F3).
	const kind = videoKind(await file.slice(0, 12).arrayBuffer());
	const ext = file.name.split(".").pop()?.toLowerCase();
	if (!kind || kind !== ext) throw new Error(`${file.name}: this isn't a real ${ext?.toUpperCase() ?? "MP4/WebM"} video (it may be renamed). Export it again as MP4 or WebM.`);
	const [bucket] = BUCKETS;
	const name = await uploadUnique(`${bucket}/${VIDEO_FOLDER}/`, cleanFileName(file.name), file, VIDEO_TYPES[kind]);
	const filePath = `${VIDEO_FOLDER}/${name}`;
	return { name, path: filePath, url: publicUrl(bucket, filePath), size: file.size, type: VIDEO_TYPES[kind], updatedAt: new Date().toISOString() };
}

export async function deleteFile(bucket: string, filePath: string): Promise<void> {
	const segments = filePath.split("/");
	const name = segments.pop() ?? "";
	const folder = cleanFolder(segments.join("/"));
	if (!name || name === "." || name === ".." || name.includes("/")) throw new Error("Invalid file path.");
	await (await r2()).delete(`${bucket}/${folder ? `${folder}/${name}` : name}`);
}

export async function createFolder(bucket: string, parent: string, name: string): Promise<string> {
	const slug = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (!slug) throw new Error("Folder name must contain letters or numbers.");
	const path = cleanFolder(parent ? `${parent}/${slug}` : slug);
	await (await r2()).put(`${bucket}/${path}/${PLACEHOLDER}`, new Uint8Array(0), { httpMetadata: { contentType: "text/plain" } });
	return path;
}

export function formatBytes(bytes: number): string {
	if (!bytes) return "—";
	const units = ["B", "KB", "MB", "GB"];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
