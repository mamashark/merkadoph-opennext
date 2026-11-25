import { z } from "zod";

/**
 * Shared server-side input schemas (security.md §7.1). Parse FormData with `formFields()` and
 * `schema.safeParse()` in Server Actions; client-side checks are only for UX.
 */

/** Plain object of the string fields in a FormData (files and repeated keys ignored). */
export function formFields<K extends string>(formData: FormData, keys: readonly K[]): Record<K, string> {
	return Object.fromEntries(keys.map((k) => [k, typeof formData.get(k) === "string" ? String(formData.get(k)) : ""])) as Record<K, string>;
}

const trimmed = (max: number) => z.string().trim().max(max);
export const emailSchema = z.string().trim().toLowerCase().max(254).email();
export const otpSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code.");

export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1).max(200),
	next: z.string().max(300),
});

export const contactSchema = z.object({
	name: trimmed(120).min(1, "Please enter your name."),
	email: z.string().trim().toLowerCase().max(254).email("Please enter a valid email address."),
	phone: trimmed(40).regex(/^[\d\s()+\-.]*$/, "Use digits, spaces and + ( ) - only."),
	topic: trimmed(120),
	message: trimmed(5000).min(10, "Please tell us a bit more (at least 10 characters)."),
});

export const checkoutSchema = z.object({
	name: trimmed(120).min(1, "Please enter your name."),
	email: z.string().trim().toLowerCase().max(254).email("Please enter a valid email address."),
	phone: trimmed(40).regex(/^[\d\s()+\-.]*$/, "Use digits, spaces and + ( ) - only."),
	address_line1: trimmed(200).min(1, "Please enter your street address."),
	address_line2: trimmed(200),
	// Swedish postcodes: 5 digits, optional space ("123 45").
	postal_code: trimmed(20).regex(/^\d{3}\s?\d{2}$/, "Please enter a valid Swedish postal code (e.g. 123 45)."),
	city: trimmed(100).min(1, "Please enter your city."),
	notes: trimmed(2000),
});

/* ---------------------------- Shopper accounts ---------------------------- */

/**
 * Password policy for every account (shoppers and admins). Must match Supabase → Auth → Sign In / Providers → Email
 * (Kay, 2026-11-22): at least 12 characters, lowercase, uppercase, digit and symbol.
 * PASSWORD_MAX is bcrypt's limit, which counts bytes: å/ä/ö take 2 bytes and emoji 4, so the byte count is checked too.
 * SYMBOL is Supabase's documented symbol set minus the backslash: in that list "\:" is most likely an escaped colon
 * (GoTrue splits required_characters on ":"), so "\" alone may not count there. Leaving it out keeps this rule
 * never looser than Supabase's (Arvid review, 2026-11-25).
 */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 72;
const SYMBOL = /[!@#$%^&*()_+\-=[\]{};':"|<>?,./`~]/;
export const passwordSchema = z
	.string()
	.min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
	.max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`)
	// Only when the character count is fine, so an over-long plain password gets one message, not two.
	.refine((s) => s.length > PASSWORD_MAX || new TextEncoder().encode(s).length <= PASSWORD_MAX,"That's too long: letters like å, ä and ö count as two characters, emoji as four.")
	.regex(/[a-z]/, "Include at least one lowercase letter.")
	.regex(/[A-Z]/, "Include at least one uppercase letter.")
	.regex(/\d/, "Include at least one number.")
	.regex(SYMBOL, "Include at least one symbol, like ! ? # or %.");

const nameField = (label: string) => trimmed(60).min(1, `Please enter your ${label}.`);

export const registerSchema = z.object({
	first_name: nameField("first name"),
	last_name: nameField("last name"),
	email: emailSchema,
	password: passwordSchema,
	marketing_opt_in: z.boolean(),
});

export const shopLoginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.").max(200) });
export const emailOnlySchema = z.object({ email: emailSchema });
export const newPasswordSchema = z.object({ password: passwordSchema });
export const changePasswordSchema = z.object({ current_password: z.string().min(1, "Enter your current password.").max(200), password: passwordSchema });
export const changeEmailSchema = z.object({ email: emailSchema, current_password: z.string().min(1, "Enter your current password.").max(200) });

/* ------------------------- Profile & address book ------------------------- */

/** Luhn checksum used by Swedish organisation and personal identity numbers. */
function luhnOk(digits: string): boolean {
	let sum = 0;
	for (let i = 0; i < digits.length; i++) {
		let d = Number(digits[digits.length - 1 - i]);
		if (i % 2 === 1) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
		sum += d;
	}
	return sum % 10 === 0;
}

/** "12345" / "123 45" → "123 45". */
export const swedishPostcode = z
	.string()
	.trim()
	.regex(/^\d{3}\s?\d{2}$/, "Enter a Swedish postal code, e.g. 123 45.")
	.transform((v) => `${v.replace(/\s/g, "").slice(0, 3)} ${v.replace(/\s/g, "").slice(3)}`);

/** Swedish org.nr (or a sole trader's personnummer): 10 digits with a valid check digit → "NNNNNN-NNNN". */
export const orgNumber = z
	.string()
	.trim()
	.transform((v) => v.replace(/[\s-]/g, ""))
	.refine((v) => v === "" || (/^\d{10}$/.test(v) && luhnOk(v)), "Enter a valid organisation number, e.g. 556677-8899.")
	.transform((v) => (v ? `${v.slice(0, 6)}-${v.slice(6)}` : ""));

export const phoneSchema = trimmed(40)
	.regex(/^\+?[\d\s()-]+$/, "Use digits, spaces and + ( ) - only.")
	.refine((v) => v.replace(/\D/g, "").length >= 7, "Enter a phone number with at least 7 digits.");

export const profileSchema = z.object({
	first_name: nameField("first name"),
	last_name: nameField("last name"),
	phone: z.union([z.literal(""), phoneSchema]),
	marketing_opt_in: z.boolean(),
});

export const addressSchema = z.object({
	label: trimmed(40),
	first_name: nameField("first name"),
	last_name: nameField("last name"),
	company: trimmed(120),
	org_number: orgNumber,
	care_of: trimmed(100),
	line1: trimmed(200).min(1, "Please enter your street address."),
	line2: trimmed(200),
	postal_code: swedishPostcode,
	city: trimmed(100).min(1, "Please enter your city."),
	country: z.literal("SE", "We can only deliver within Sweden right now."),
	phone: phoneSchema,
	is_default_shipping: z.boolean(),
	is_default_billing: z.boolean(),
});

/* ------------------------------- Checkout v2 ------------------------------ */

/** A delivery/billing address as typed at checkout (same rules as the address book). */
export const orderAddressSchema = addressSchema.omit({ label: true, is_default_shipping: true, is_default_billing: true });

export const checkoutInputSchema = z.object({
	email: emailSchema,
	/** Saved address id (signed-in customers) — when set, `shipping` is ignored. */
	address_id: z.union([z.literal(""), z.uuid()]),
	shipping: orderAddressSchema.optional(),
	billing_same: z.boolean(),
	billing: orderAddressSchema.optional(),
	save_address: z.boolean(),
	shipping_method_id: z.uuid("Choose a delivery option."),
	payment_method: z.enum(["manual", "stripe", "paypal"], "Choose a payment method."),
	notes: trimmed(2000),
	terms: z.literal(true, "Please accept the terms and privacy policy to place your order."),
	/** Fingerprint of the quote the customer saw (D19). */
	quote_hash: z.string().max(64),
});

/** First error message per field, for inline form errors. */
export function fieldErrors<T extends z.ZodTypeAny>(result: z.ZodSafeParseError<z.infer<T>>): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of result.error.issues) {
		const key = String(issue.path[0] ?? "");
		if (key && !out[key]) out[key] = issue.message;
	}
	return out;
}

/** A row id. One definition for admin pages (via form-parts) and Server Actions. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuidSchema = z.string().trim().regex(UUID);
