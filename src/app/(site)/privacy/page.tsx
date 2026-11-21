import { LegalPage, legalMetadata } from "@/components/site/legal-page";

export const revalidate = 86400; // CACHE_TTL (a day); purged on save and via Admin → Cache → Site settings & legal
export const generateMetadata = () => legalMetadata("privacy");

export default function Page() {
	return <LegalPage id="privacy" />;
}
