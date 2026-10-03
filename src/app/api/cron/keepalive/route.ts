import { NextResponse } from "next/server";
import { runKeepAlive } from "@/lib/keepalive";
import { secret } from "@/lib/secrets";

/**
 * Called by the Worker's scheduled (cron) handler in cloudflare-worker.js.
 * Protected by the CRON_SECRET Worker secret; anything else gets 401.
 */
export async function POST(request: Request) {
	let expected: string;
	try {
		expected = secret("CRON_SECRET");
	} catch {
		return NextResponse.json({ ok: false, error: "Cron is not configured." }, { status: 503 });
	}

	const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
	if (!safeEqual(given, expected)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

	const result = await runKeepAlive("cron", null);
	return NextResponse.json(result, { status: result.ok ? 200 : 500, headers: { "Cache-Control": "no-store" } });
}

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
	const enc = new TextEncoder();
	const x = enc.encode(a);
	const y = enc.encode(b);
	let diff = x.length ^ y.length;
	for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
	return diff === 0;
}
