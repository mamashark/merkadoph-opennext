import { IBM_Plex_Mono } from "next/font/google";

/** Mono face of the constellation pages (labels, kickers, hints). One instance, shared. */
export const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });
