/**
 * Redirect lookup for src/proxy.ts (seo.md §7). The whole `redirects` table is small, so each
 * Worker isolate keeps a copy in memory for a minute instead of querying on every request.
 * Uses the public REST API (anon key, RLS: select only), so it works in the proxy runtime.
 */
type Rule = { to: string; status: 301 | 302 | 307 | 308 };

const TTL_MS = 60_000;
let table: Map<string, Rule> | null = null;
let loadedAt = 0;
let loading: Promise<Map<string, Rule>> | null = null;

const base = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const headers = () => ({ apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` });

async function load(): Promise<Map<string, Rule>> {
	try {
		const res = await fetch(`${base()}/rest/v1/redirects?select=from_path,to_path,status&limit=10000`, { headers: headers(), cache: "no-store" });
		if (!res.ok) return table ?? new Map();
		const rows = (await res.json()) as Array<{ from_path: string; to_path: string; status: Rule["status"] }>;
		return new Map(rows.map((r) => [r.from_path.toLowerCase(), { to: r.to_path, status: r.status }]));
	} catch {
		return table ?? new Map(); // Keep serving the last copy if Supabase is unreachable.
	}
}

export async function findRedirect(pathname: string): Promise<Rule | null> {
	if (!table || Date.now() - loadedAt > TTL_MS) {
		loading ??= load().finally(() => (loading = null));
		table = await loading;
		loadedAt = Date.now();
	}
	if (!table.size) return null;
	const key = (pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname).toLowerCase();
	return table.get(key) ?? null;
}

/** Counts a hit (fire-and-forget via waitUntil). */
export function recordRedirectHit(pathname: string): Promise<unknown> {
	return fetch(`${base()}/rest/v1/rpc/redirect_hit`, {
		method: "POST",
		headers: { ...headers(), "Content-Type": "application/json" },
		body: JSON.stringify({ p_from: pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname }),
	}).catch(() => null);
}
