import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_FILES_PER_UPLOAD, uploadProblem, VIDEO_TYPES, videoProblem } from "@/lib/upload-rules";

// Callers must have passed requireAdmin(): everything here uses the service role.

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

/** Supabase Studio's marker object for empty folders. */
const PLACEHOLDER = ".emptyFolderPlaceholder";

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
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
	return `${base || "image"}${ext ? "." + ext : ""}`;
}

export async function listBuckets(): Promise<string[]> {
	const { data, error } = await createAdminClient().storage.listBuckets();
	if (error) throw new Error(`Failed to load buckets: ${error.message}`);
	// Only public buckets: media is referenced by public URL on the site.
	return data.filter((b) => b.public).map((b) => b.name).sort();
}

export async function assertBucket(bucket: string): Promise<string> {
	const buckets = await listBuckets();
	if (!buckets.includes(bucket)) throw new Error(`Unknown or private bucket: ${bucket}`);
	return bucket;
}

export function publicUrl(bucket: string, path: string): string {
	return createAdminClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function listFolder(bucket: string, folder: string): Promise<MediaListing> {
	const path = cleanFolder(folder);
	const { data, error } = await createAdminClient()
		.storage.from(bucket)
		.list(path || undefined, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
	if (error) throw new Error(`Failed to list media: ${error.message}`);

	const folders: string[] = [];
	const files: MediaFile[] = [];
	for (const item of data) {
		if (item.name === PLACEHOLDER) continue;
		// Folders come back without an id.
		if (!item.id) {
			folders.push(item.name);
			continue;
		}
		const filePath = path ? `${path}/${item.name}` : item.name;
		files.push({
			name: item.name,
			path: filePath,
			url: publicUrl(bucket, filePath),
			size: Number(item.metadata?.size ?? 0),
			type: String(item.metadata?.mimetype ?? ""),
			updatedAt: item.updated_at ?? item.created_at ?? null,
		});
	}
	folders.sort((a, b) => a.localeCompare(b));
	return { bucket, path, folders, files };
}

export async function uploadImages(bucket: string, folder: string, files: File[]): Promise<MediaFile[]> {
	const path = cleanFolder(folder);
	const storage = createAdminClient().storage.from(bucket);
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

	for (const [i, file] of files.entries()) {
		const clean = cleanFileName(file.name);
		const body = bodies[i];
		// Never overwrite: on a name clash add a short suffix and retry.
		for (let attempt = 0; attempt < 5; attempt++) {
			const name = attempt === 0 ? clean : clean.replace(/(\.[a-z0-9]+)?$/, `-${Math.random().toString(36).slice(2, 7)}$1`);
			const filePath = path ? `${path}/${name}` : name;
			const { error } = await storage.upload(filePath, body, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
			if (!error) {
				uploaded.push({ name, path: filePath, url: publicUrl(bucket, filePath), size: file.size, type: "image/webp", updatedAt: new Date().toISOString() });
				break;
			}
			const exists = /exists|duplicate/i.test(error.message);
			if (!exists || attempt === 4) throw new Error(`${file.name}: ${error.message}`);
		}
	}
	return uploaded;
}

/** Folder videos go into, in the first public bucket. */
const VIDEO_FOLDER = "videos";

/** Uploads one MP4 / WebM (blog video / reel) to the media library. Never overwrites an existing file. */
export async function uploadVideo(file: File): Promise<MediaFile> {
	const problem = videoProblem(file);
	if (problem) throw new Error(problem);
	// Only the first bytes are read to check the format (Sig F3); the file itself is streamed to Storage.
	const kind = videoKind(await file.slice(0, 12).arrayBuffer());
	const ext = file.name.split(".").pop()?.toLowerCase();
	if (!kind || kind !== ext) throw new Error(`${file.name}: this isn't a real ${ext?.toUpperCase() ?? "MP4/WebM"} video (it may be renamed). Export it again as MP4 or WebM.`);
	const [bucket] = await listBuckets();
	if (!bucket) throw new Error("No public storage bucket found.");
	const storage = createAdminClient().storage.from(bucket);
	const clean = cleanFileName(file.name);
	for (let attempt = 0; attempt < 5; attempt++) {
		const name = attempt === 0 ? clean : clean.replace(/(\.[a-z0-9]+)?$/, `-${Math.random().toString(36).slice(2, 7)}$1`);
		const filePath = `${VIDEO_FOLDER}/${name}`;
		const { error } = await storage.upload(filePath, file, { contentType: VIDEO_TYPES[kind], cacheControl: "31536000", upsert: false });
		if (!error) return { name, path: filePath, url: publicUrl(bucket, filePath), size: file.size, type: VIDEO_TYPES[kind], updatedAt: new Date().toISOString() };
		if (!/exists|duplicate/i.test(error.message) || attempt === 4) throw new Error(`${file.name}: ${error.message}`);
	}
	throw new Error(`${file.name}: couldn't find a free file name.`);
}

export async function deleteFile(bucket: string, filePath: string): Promise<void> {
	const segments = filePath.split("/");
	const name = segments.pop() ?? "";
	const folder = cleanFolder(segments.join("/"));
	if (!name || name === "." || name === "..") throw new Error("Invalid file path.");
	const { error } = await createAdminClient()
		.storage.from(bucket)
		.remove([folder ? `${folder}/${name}` : name]);
	if (error) throw new Error(`Failed to delete: ${error.message}`);
}

export async function createFolder(bucket: string, parent: string, name: string): Promise<string> {
	const slug = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (!slug) throw new Error("Folder name must contain letters or numbers.");
	const path = cleanFolder(parent ? `${parent}/${slug}` : slug);
	const { error } = await createAdminClient()
		.storage.from(bucket)
		.upload(`${path}/${PLACEHOLDER}`, new Uint8Array(0), { contentType: "text/plain", upsert: true });
	if (error) throw new Error(`Failed to create folder: ${error.message}`);
	return path;
}

export function formatBytes(bytes: number): string {
	if (!bytes) return "—";
	const units = ["B", "KB", "MB", "GB"];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
