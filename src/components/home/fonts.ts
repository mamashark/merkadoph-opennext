import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";

/** Homepage typefaces (self-hosted by next/font, so no third-party font requests). */
export const displayFont = Bricolage_Grotesque({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-bricolage", display: "swap" });
export const bodyFont = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap" });
