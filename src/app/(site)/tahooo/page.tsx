import { TahoooPage, tahoooMetadata } from "@/components/tahooo/tahooo-page";

// Static content (src/lib/tahooo-content.ts), served from the cache and refreshed every 5 minutes like the other pages.
export const revalidate = 300;

export const generateMetadata = tahoooMetadata;

export default function Page() {
	return <TahoooPage />;
}
