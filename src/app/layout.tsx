import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/env";
import { getSeoSettings } from "@/lib/site-settings";

/** Display text: logo text, headings, event date numbers, price tags. */
const bricolage = Bricolage_Grotesque({
	variable: "--font-bricolage",
	subsets: ["latin"],
	weight: ["500", "700", "800"],
	display: "swap",
});

/** Body text: paragraphs, navigation, buttons, labels, form fields (designed for low-vision readers). */
const atkinson = Atkinson_Hyperlegible({
	variable: "--font-atkinson",
	subsets: ["latin"],
	weight: ["400", "700"],
	style: ["normal", "italic"],
	display: "swap",
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const viewport: Viewport = {
	colorScheme: "light dark",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#fbf7ef" },
		{ media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
	],
};

const baseMetadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
	applicationName: SITE_NAME,
	openGraph: { siteName: SITE_NAME, locale: "en_PH", type: "website" },
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "any" },
			{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
			{ url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
		],
		apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
	},
	manifest: "/site.webmanifest",
};

/** Site-wide defaults; description, share image and search-engine verification come from Admin → SEO. */
export async function generateMetadata(): Promise<Metadata> {
	const seo = await getSeoSettings();
	return {
		...baseMetadata,
		description: seo.site_description,
		openGraph: { ...baseMetadata.openGraph, images: seo.default_og_image ? [{ url: seo.default_og_image, alt: seo.default_og_alt || SITE_NAME }] : undefined },
		verification: {
			...(seo.google_verification ? { google: seo.google_verification } : {}),
			...(seo.bing_verification ? { other: { "msvalidate.01": seo.bing_verification } } : {}),
		},
		alternates: { types: { "application/rss+xml": [{ url: "/blogs/rss.xml", title: `${SITE_NAME} blog` }] } },
	};
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${atkinson.variable} ${bricolage.variable} ${geistMono.variable} antialiased`}>{children}</body>
		</html>
	);
}
