import { DigitalPage, digitalMetadata } from "@/components/site/digital-page";

// Static content (src/lib/digital-content.ts), served from the cache and refreshed every 5 minutes like the other pages.
export const revalidate = 300;

export const generateMetadata = digitalMetadata;

export default function Page() {
	return <DigitalPage />;
}
