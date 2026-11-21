import { ByggPage, byggMetadata } from "@/components/site/bygg-page";

// Static content (src/lib/bygg-content.ts), served from the cache and refreshed once a day like the other pages.
export const revalidate = 86400;

export const generateMetadata = byggMetadata;

export default function Page() {
	return <ByggPage />;
}
