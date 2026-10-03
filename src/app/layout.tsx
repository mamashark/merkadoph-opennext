import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/env";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
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

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
	description: "Merkado PH: Bagong Yugto, coming soon! Abangan!",
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

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
		</html>
	);
}
