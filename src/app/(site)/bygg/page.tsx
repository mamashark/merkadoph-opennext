import { BUSINESSES } from "@/lib/businesses";
import { BusinessPage, businessMetadata } from "@/components/site/business-page";

// Cached as an ISR page; refreshed every 5 minutes or when services are saved / purged in Admin → Cache.
export const revalidate = 300;

export const generateMetadata = () => businessMetadata(BUSINESSES.bygg);

export default function Page() {
	return <BusinessPage business={BUSINESSES.bygg} />;
}
