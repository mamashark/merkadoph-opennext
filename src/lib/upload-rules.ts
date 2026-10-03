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
