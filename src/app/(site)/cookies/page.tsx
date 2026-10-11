import { LegalPage, legalMetadata } from "@/components/site/legal-page";

export const revalidate = 300; // CACHE_TTL; purged on save and via Admin → Cache → Site settings & legal
export const generateMetadata = () => legalMetadata("cookies");

export default function Page() {
	return <LegalPage id="cookies" />;
}
