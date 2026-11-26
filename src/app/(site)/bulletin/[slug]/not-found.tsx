import Link from "next/link";
import { EmptyNotice } from "@/components/site/content-card";

/**
 * Shown for an unknown slug, and for a press item requested on /bulletin (it lives on /press, spec §4.7).
 * A plain 404 rather than a redirect: Next forbids a redirect thrown from inside a cached page component.
 */
export default function BulletinNotFound() {
	return (
		<main className="accent-bulletin mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
			<EmptyNotice title="That notice isn’t here." description="It may have been removed, or it may live elsewhere: press items are collected under Press & Media." />
			<p className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
				<Link href="/bulletin" className="min-h-11 underline underline-offset-4 hover:text-accent">
					Back to the Bulletin Board
				</Link>
				<Link href="/press" className="min-h-11 underline underline-offset-4 hover:text-accent">
					Press & Media
				</Link>
			</p>
		</main>
	);
}
