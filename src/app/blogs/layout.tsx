import Image from "next/image";
import Link from "next/link";

export default function BlogsLayout({ children }: LayoutProps<"/blogs">) {
	return (
		<div className="flex min-h-dvh flex-col bg-[#fbf7ef] text-slate-900">
			<header className="sticky top-0 z-30 border-b border-amber-900/10 bg-[#fbf7ef]/90 backdrop-blur">
				<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
					<Link href="/" aria-label="Merkado PH home">
						<Image src="/logo.webp" alt="Merkado PH" width={600} height={188} priority className="h-auto w-36" />
					</Link>
					<nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
						<Link href="/blogs" className="hover:text-slate-900">
							Blog
						</Link>
					</nav>
				</div>
			</header>

			<div className="flex-1">{children}</div>

			<footer className="border-t border-amber-900/10">
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
					<p>© {new Date().getFullYear()} Merkado PH. All rights reserved.</p>
					<p className="font-medium text-slate-600">Bagong Merkado, coming soon! Abangan!</p>
				</div>
			</footer>
		</div>
	);
}
