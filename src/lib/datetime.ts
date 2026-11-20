/**
 * All dates are shown, and all admin date inputs are entered, in Swedish time (Europe/Stockholm: CET, CEST in summer),
 * and stored as UTC. (Until 2026-11-20 this was Philippine time; stored times were re-saved so the typed clock times stayed.)
 */
export const SITE_TIME_ZONE = "Europe/Stockholm";

/** Minutes the site time zone is ahead of UTC at the given instant (60 in winter, 120 in summer). */
function zoneOffsetMinutes(at: Date): number {
	const parts = new Intl.DateTimeFormat("en-US", { timeZone: SITE_TIME_ZONE, timeZoneName: "longOffset" }).formatToParts(at);
	const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(parts.find((p) => p.type === "timeZoneName")?.value ?? "");
	return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
}

/** ISO timestamp → value for <input type="datetime-local"> in Swedish time. */
export function toDateTimeInput(value: string | null | undefined): string {
	if (!value) return "";
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: SITE_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(new Date(value));
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
	return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** <input type="datetime-local"> value (Swedish time) → ISO timestamp, or null when empty/invalid. Handles summer time. */
export function fromDateTimeInput(value: FormDataEntryValue | null | undefined): string | null {
	const v = typeof value === "string" ? value.trim() : "";
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
	const asUtc = new Date(`${v}:00Z`);
	if (Number.isNaN(asUtc.getTime())) return null;
	// Subtract the zone's offset; check again at the result, in case the guess crossed a summer-time change.
	let date = new Date(asUtc.getTime() - zoneOffsetMinutes(asUtc) * 60_000);
	date = new Date(asUtc.getTime() - zoneOffsetMinutes(date) * 60_000);
	return date.toISOString();
}

/**
 * An event saved at exactly midnight Swedish time has a known date but no known start time
 * (e.g. older events from the blog). It's shown as a date only, never as "12:00 AM".
 */
export function isDateOnly(value: string | null | undefined): boolean {
	return !!value && toDateTimeInput(value).endsWith("T00:00");
}

/** The event start for display: "Saturday, April 27, 2024" when only the date is known, else date and time. */
export function formatStart(value: string | null | undefined): string {
	return formatDate(value, isDateOnly(value) ? { dateStyle: "full" } : { dateStyle: "full", timeStyle: "short" });
}

/** For schema.org: "2024-04-27" when only the date is known, else the full timestamp. */
export function schemaDate(value: string | null | undefined): string | undefined {
	if (!value) return undefined;
	return isDateOnly(value) ? toDateTimeInput(value).slice(0, 10) : value;
}

export function formatDate(value: string | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }): string {
	if (!value) return "—";
	return new Intl.DateTimeFormat("en-PH", { timeZone: SITE_TIME_ZONE, ...opts }).format(new Date(value));
}

/** "Sat, Oct 18, 2026 · 9:00 AM – 5:00 PM" or across days "Oct 18, 9:00 AM – Oct 19, 2026, 5:00 PM". */
export function formatRange(start: string | null | undefined, end: string | null | undefined): string {
	if (!start) return end ? `Until ${formatDate(end, { dateStyle: "medium", timeStyle: "short" })}` : "—";
	if (!end) return formatStart(start);
	const sameDay = formatDate(start, { dateStyle: "medium" }) === formatDate(end, { dateStyle: "medium" });
	if (sameDay) return `${formatDate(start, { dateStyle: "full" })} · ${formatDate(start, { timeStyle: "short" })} – ${formatDate(end, { timeStyle: "short" })}`;
	return `${formatDate(start, { dateStyle: "medium", timeStyle: "short" })} – ${formatDate(end, { dateStyle: "medium", timeStyle: "short" })}`;
}

/** Date-only range for promotions: "Oct 1 – Oct 31, 2026". */
export function formatDayRange(start: string | null | undefined, end: string | null | undefined): string {
	if (start && end) return `${formatDate(start, { month: "short", day: "numeric" })} – ${formatDate(end, { dateStyle: "medium" })}`;
	if (end) return `Until ${formatDate(end, { dateStyle: "medium" })}`;
	if (start) return `From ${formatDate(start, { dateStyle: "medium" })}`;
	return "Ongoing";
}
