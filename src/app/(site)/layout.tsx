import { SiteShell } from "@/components/site/site-shell";

/** Public site shell for /blogs, /events, /promotions and /services. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
	return <SiteShell>{children}</SiteShell>;
}
