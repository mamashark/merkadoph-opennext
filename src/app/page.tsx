import { homeMetadata } from "@/components/home/home-page";
import { HighlightsHome } from "@/components/highlights/highlights-home";

/**
 * The real homepage: the Highlights constellation and one section per content type.
 * While the site is in "coming soon" mode, src/proxy.ts shows /maintenance here instead unless the
 * visitor has the staging key (see src/lib/stage.ts). The previous homepage (components/home/home-page.tsx)
 * is kept in the code but no longer rendered.
 */

// ISR: cached and refreshed every 5 minutes or when content is saved / purged in Admin → Cache.
export const revalidate = 300;

export const generateMetadata = homeMetadata;

export default function Page() {
	return <HighlightsHome />;
}
