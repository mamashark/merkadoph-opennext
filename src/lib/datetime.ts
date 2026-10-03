/**
 * All admin date inputs are entered in Philippine time (UTC+8, no DST) and stored as UTC.
 */
export const SITE_TIME_ZONE = "Asia/Manila";
const MANILA_OFFSET = "+08:00";

/** ISO timestamp → value for <input type="datetime-local"> in Manila time. */
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

/** <input type="datetime-local"> value (Manila time) → ISO timestamp, or null when empty/invalid. */
export function fromDateTimeInput(value: FormDataEntryValue | null | undefined): string | null {
	const v = typeof value === "string" ? value.trim() : "";
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
	const date = new Date(`${v}:00${MANILA_OFFSET}`);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatDate(value: string | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }): string {
	if (!value) return "—";
	return new Intl.DateTimeFormat("en-PH", { timeZone: SITE_TIME_ZONE, ...opts }).format(new Date(value));
}

/** "Sat, Oct 18, 2026 · 9:00 AM – 5:00 PM" or across days "Oct 18, 9:00 AM – Oct 19, 2026, 5:00 PM". */
export function formatRange(start: string | null | undefined, end: string | null | undefined): string {
	if (!start) return end ? `Until ${formatDate(end, { dateStyle: "medium", timeStyle: "short" })}` : "—";
	if (!end) return formatDate(start, { dateStyle: "full", timeStyle: "short" });
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
