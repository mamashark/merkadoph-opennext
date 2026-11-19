import { ByggPage, byggMetadata } from "@/components/site/bygg-page";

// Static content (src/lib/bygg-content.ts), served from the cache and refreshed every 5 minutes like the other pages.
export const revalidate = 300;

export const generateMetadata = byggMetadata;

export default function Page() {
	return <ByggPage />;
}
