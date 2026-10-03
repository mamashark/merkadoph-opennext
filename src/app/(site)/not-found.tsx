import { NotFoundContent } from "@/components/site/not-found-content";

/** notFound() inside /blogs, /events, /promotions, /services (already wrapped by the site layout). */
export default function SiteNotFound() {
	return <NotFoundContent />;
}
