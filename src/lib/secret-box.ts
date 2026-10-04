import "server-only";
import { secret } from "@/lib/secrets";

/**
 * Encrypts values (e.g. payment gateway keys) before they are stored in the database.
 * AES-256-GCM with the SETTINGS_ENCRYPTION_KEY Worker secret (32 random bytes, base64).
 * Stored format: "v1:<iv base64>:<ciphertext base64>".
 */
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

let keyPromise: Promise<CryptoKey> | null = null;
function key(): Promise<CryptoKey> {
	if (!keyPromise) {
		const raw = unb64(secret("SETTINGS_ENCRYPTION_KEY"));
		if (raw.length !== 32) throw new Error("SETTINGS_ENCRYPTION_KEY must be 32 bytes (base64).");
		keyPromise = crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
	}
	return keyPromise;
}

export async function seal(plain: string): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), new TextEncoder().encode(plain)));
	return `v1:${b64(iv)}:${b64(ct)}`;
}

export async function open(sealed: string | null | undefined): Promise<string | null> {
	if (!sealed) return null;
	const [version, iv, ct] = sealed.split(":");
	if (version !== "v1" || !iv || !ct) return null;
	try {
		const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await key(), unb64(ct));
		return new TextDecoder().decode(plain);
	} catch {
		// Wrong key (e.g. SETTINGS_ENCRYPTION_KEY was rotated): treat as not set.
		return null;
	}
}
