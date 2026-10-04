import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Reads a Cloudflare Worker secret. On the deployed Worker secrets are copied into process.env;
 * under `next dev` they come from `.dev.vars` via the Cloudflare context. Secrets are deliberately
 * kept out of .env files, because OpenNext bundles those into the Worker.
 */
export function secret(name: "SUPABASE_SERVICE_ROLE_KEY" | "CRON_SECRET" | "STAGE_KEY" | "SETTINGS_ENCRYPTION_KEY" | "RECAPTCHA_SECRET_KEY"): string {
	let value = process.env[name];
	if (!value) {
		try {
			value = (getCloudflareContext().env as Record<string, unknown>)[name] as string | undefined;
		} catch {
			// No Cloudflare context (e.g. during `next build`).
		}
	}
	if (typeof value !== "string" || !value) throw new Error(`Missing secret: ${name}`);
	return value;
}
