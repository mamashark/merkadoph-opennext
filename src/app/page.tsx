import type { Metadata } from "next";
import { HomePage, homeMetadata } from "@/components/home/home-page";

/**
 * The real homepage. While the site is in "coming soon" mode, src/proxy.ts shows /maintenance
 * here instead unless the visitor has the staging key (see src/lib/stage.ts).
 */

// ISR: cached and refreshed every 5 minutes or when content is saved / purged in Admin → Cache.
export const revalidate = 300;

export const metadata: Metadata = homeMetadata;

export default function Page() {
	return <HomePage />;
}
