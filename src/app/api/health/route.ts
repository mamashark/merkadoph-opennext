import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Uptime check for monitors (UptimeRobot, Better Stack…): 200 when the Worker and database answer,
 * 503 otherwise. Deliberately says nothing else (no versions, no error text).
 */
export async function GET() {
	let db = false;
	try {
		const { error } = await createAdminClient().from("site_settings").select("key", { head: true, count: "exact" }).limit(1);
		db = !error;
	} catch {
		db = false;
	}
	return NextResponse.json({ ok: db }, { status: db ? 200 : 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
