/**
 * Password length limits, shared by the server schema (src/lib/validation.ts) and form hints.
 * Kept free of imports so client components can use them without bundling zod.
 */
export const PASSWORD_MIN = 12;
/** bcrypt's limit, in bytes: å/ä/ö count 2 and emoji 4 (the schema checks bytes too). */
export const PASSWORD_MAX = 72;
