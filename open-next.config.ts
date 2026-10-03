import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

/**
 * Caching on Cloudflare (see https://opennext.js.org/cloudflare/caching):
 * - incrementalCache: cached pages (ISR) and data (unstable_cache) live in KV (binding NEXT_INC_CACHE_KV).
 * - tagCache: purges (revalidateTag / updateTag / revalidatePath) are recorded in D1 (binding NEXT_TAG_CACHE_D1),
 *   which is strongly consistent, so a purge applies on the very next request.
 * - queue: time-based revalidation re-renders in the background via the WORKER_SELF_REFERENCE binding.
 */
export default defineCloudflareConfig({
	incrementalCache: kvIncrementalCache,
	tagCache: d1NextTagCache,
	queue: memoryQueue,
});
