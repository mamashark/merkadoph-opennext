#!/usr/bin/env node
/**
 * One-off (2026-11-27): copies the media library from Supabase Storage to the Cloudflare R2 bucket `merkadoph-media`,
 * keeping every key as `<bucket>/<path>`, so `<SUPABASE>/storage/v1/object/public/<key>` becomes `<MEDIA_URL>/<key>`.
 *
 * Input: a JSON array of { key, type } (e.g. from SQL:
 *   select json_agg(json_build_object('key', bucket_id || '/' || name, 'type', metadata->>'mimetype'))
 *   from storage.objects where name not like '%.emptyFolderPlaceholder';)
 *
 * Usage: node scripts/copy-media-to-r2.mjs <keys.json> [--dry-run]
 * Reads only public URLs (no secrets). Writes with `wrangler r2 object put --remote` (needs `wrangler login`).
 * Safe to re-run: existing objects are overwritten with the same bytes. Supabase files are left in place.
 */
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const SUPABASE = "https://vajknggrwhjayssylfny.supabase.co";
const R2_BUCKET = "merkadoph-media";
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const PARALLEL = 6;

const [file, flag] = process.argv.slice(2);
if (!file) {
	console.error("Usage: node scripts/copy-media-to-r2.mjs <keys.json> [--dry-run]");
	process.exit(1);
}
const dryRun = flag === "--dry-run";
const items = JSON.parse(await readFile(file, "utf8"));
const dir = await mkdtemp(join(tmpdir(), "media-r2-"));
let done = 0;
const failed = [];

async function copy({ key, type }) {
	const src = `${SUPABASE}/storage/v1/object/public/${key.split("/").map(encodeURIComponent).join("/")}`;
	if (dryRun) return console.log(`would copy ${key} (${type})`);
	const res = await fetch(src);
	if (!res.ok) throw new Error(`${res.status} ${src}`);
	const tmp = join(dir, String(++done));
	await writeFile(tmp, Buffer.from(await res.arrayBuffer()));
	const args = ["wrangler", "r2", "object", "put", `${R2_BUCKET}/${key}`, "--file", tmp, "--cache-control", CACHE_CONTROL, "--remote"];
	if (type) args.push("--content-type", type);
	await run("npx", args);
	await rm(tmp);
	console.log(`${done}/${items.length} ${key}`);
}

const queue = [...items];
await Promise.all(
	Array.from({ length: PARALLEL }, async () => {
		for (let item = queue.shift(); item; item = queue.shift()) {
			try {
				await copy(item);
			} catch (e) {
				failed.push(item.key);
				console.error(`FAILED ${item.key}: ${e.message}`);
			}
		}
	}),
);
await rm(dir, { recursive: true, force: true });
console.log(`\nCopied ${items.length - failed.length} of ${items.length}.${failed.length ? ` Failed:\n${failed.join("\n")}` : ""}`);
process.exit(failed.length ? 1 : 0);
