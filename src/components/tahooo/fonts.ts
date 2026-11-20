import { Google_Sans } from "next/font/google";

/** Tahooo brand type: Google Sans, as on the Tahooo Corner slides. Self-hosted at build, like the site's other fonts. */
export const tahoooDisplay = Google_Sans({ variable: "--font-tahooo-display", subsets: ["latin", "latin-ext"], weight: ["400", "500", "700"], style: ["normal", "italic"], display: "swap" });
