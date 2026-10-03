import type { Metadata } from "next";
import { SiteShell } from "@/components/site/site-shell";
import { NotFoundContent } from "@/components/site/not-found-content";

export const metadata: Metadata = {
	title: "Page not found",
	description: "The page you're looking for doesn't exist or has moved. Explore Merkado PH services, promotions, events and blog.",
	robots: { index: false, follow: true },
};

/** Unmatched URLs and notFound() outside the (site) and admin sections. */
export default function NotFound() {
	return (
		<SiteShell>
			<NotFoundContent />
		</SiteShell>
	);
}
