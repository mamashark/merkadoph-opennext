/**
 * Media upload rules, shared by the server check, the file inputs and the on-screen notes.
 * WebP only, 2 MB max, so every image on the site is already optimized.
 */
export const MAX_UPLOAD_MB = 2;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 5;
export const ALLOWED_IMAGE_TYPES = ["image/webp"];
export const UPLOAD_ACCEPT = "image/webp,.webp";
export const UPLOAD_RULES_TEXT = `WebP images only · ${MAX_UPLOAD_MB} MB max per file · up to ${MAX_FILES_PER_UPLOAD} files at a time`;

/** Client- and server-side check. Returns an error message, or null when the file is acceptable. */
export function uploadProblem(file: { name: string; type: string; size: number }): string | null {
	const isWebp = ALLOWED_IMAGE_TYPES.includes(file.type) && /\.webp$/i.test(file.name);
	if (!isWebp) return `${file.name}: only WebP images (.webp) are allowed. Convert it to WebP first.`;
	if (file.size > MAX_UPLOAD_BYTES) return `${file.name}: is ${(file.size / 1024 / 1024).toFixed(1)} MB — images must be ${MAX_UPLOAD_MB} MB or smaller.`;
	return null;
}

/* Videos / reels (blog posts): MP4 or WebM, played with the browser's own player. Kept small enough to go through
   a Server Action (next.config.ts bodySizeLimit) and to stream well on a phone. */
export const MAX_VIDEO_MB = 20;
export const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
export const VIDEO_TYPES: Record<string, string> = { mp4: "video/mp4", webm: "video/webm" };
export const VIDEO_ACCEPT = "video/mp4,video/webm,.mp4,.webm";
export const VIDEO_RULES_TEXT = `MP4 or WebM · ${MAX_VIDEO_MB} MB max · vertical 9:16 for reels`;

/** Client- and server-side check for a video. Returns an error message, or null when the file is acceptable. */
export function videoProblem(file: { name: string; size: number }): string | null {
	const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
	if (!VIDEO_TYPES[ext]) return `${file.name}: only MP4 or WebM videos are allowed.`;
	if (file.size > MAX_VIDEO_BYTES) return `${file.name}: is ${(file.size / 1024 / 1024).toFixed(1)} MB — videos must be ${MAX_VIDEO_MB} MB or smaller. Export it at 720p or shorten it.`;
	return null;
}
