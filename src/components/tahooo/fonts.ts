import { Google_Sans, Karla } from "next/font/google";

/** Tahooo brand type (Brand Guide): Google Sans for display, Karla for body. Self-hosted at build, like the site's other fonts. */
export const tahoooDisplay = Google_Sans({ variable: "--font-tahooo-display", subsets: ["latin", "latin-ext"], weight: ["500", "700"], style: ["normal", "italic"], display: "swap" });
export const tahoooBody = Karla({ variable: "--font-tahooo-body", subsets: ["latin", "latin-ext"], weight: ["400", "600", "700"], display: "swap" });
